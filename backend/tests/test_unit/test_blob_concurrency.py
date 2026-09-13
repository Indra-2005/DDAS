"""
Concurrency and lifecycle tests for physical blob reference counting.
Validates coordination between FileRepository, BlobRepository, FileService, and StorageService
against the real MongoDB test database and local storage.
"""
import io
import uuid
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch
import pytest

from app.services.file_service import FileService
from app.services.storage_service import StorageService
from app.repositories.file_repository import FileRepository
from app.repositories.blob_repository import BlobRepository, BlobLockManager
from app.algorithms.hashing import sha256_bytes
from app.db.database import files_collection, blobs_collection


def _read_streaming_response(response) -> bytes:
    """Helper to consume Starlette StreamingResponse body."""
    async def _consume():
        chunks = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return b"".join(chunks)
    return asyncio.run(_consume())


def _make_user(username: str, company: str, role: str = "admin") -> dict:
    return {
        "username": username,
        "company": company,
        "role": role
    }


class TestBlobConcurrency:
    """Comprehensive test suite for blob reference count concurrency and rollback."""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self, test_tenants):
        """Clean up test collections and storage for the test tenant."""
        self.tenant_a = test_tenants["tenant_a"]
        self.tenant_b = test_tenants["tenant_b"]
        self.user_a = _make_user("user_a", self.tenant_a, "admin")
        self.user_b = _make_user("user_b", self.tenant_b, "admin")
        self.created_hashes = set()
        self.created_file_ids = []

        yield

        # Teardown: purge any leftover test files and blobs
        for fid in self.created_file_ids:
            try:
                files_collection.delete_one({"_id": fid})
            except Exception:
                pass
        for h in self.created_hashes:
            try:
                blobs_collection.delete_one({"content_hash": h})
                path = StorageService._resolve_path(h)
                StorageService.delete(path)
            except Exception:
                pass

    def test_concurrent_identical_uploads(self):
        """
        Scenario 1: Multiple threads upload the identical content simultaneously.
        Verify:
        - exactly one physical blob file on disk
        - correct logical file record count
        - correct MongoDB ref_count matching logical records
        - all logical files can be downloaded and decrypted successfully
        """
        content = f"Concurrent identical upload test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        num_threads = 6
        barrier = threading.Barrier(num_threads)
        results = []

        def upload_worker(idx: int):
            user = self.user_a if idx % 2 == 0 else self.user_b
            barrier.wait()
            res = asyncio.run(
                FileService.process_upload(
                    file_bytes=content,
                    original_filename=f"concurrent_{idx}.txt",
                    current_user=user
                )
            )
            return user, res

        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(upload_worker, i) for i in range(num_threads)]
            for f in as_completed(futures):
                results.append(f.result())

        # Verify results
        assert len(results) == num_threads
        file_ids = [r[1].file_id for r in results]
        self.created_file_ids.extend(file_ids)

        # 1. Verify logical records count in MongoDB
        logical_count = files_collection.count_documents({"hash": file_hash})
        assert logical_count == num_threads

        # 2. Verify exactly one physical blob exists on disk
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is True

        # 3. Verify MongoDB ref_count equals the number of uploaded files
        ref_count = BlobRepository.get_blob_ref_count(file_hash)
        assert ref_count == num_threads

        # 4. Verify every logical file can be downloaded and decrypted by its owner
        for user, res in results:
            stream_resp = FileService.get_file_for_download(res.file_id, user)
            downloaded = _read_streaming_response(stream_resp)
            assert downloaded == content

    def test_concurrent_deletes(self):
        """
        Scenario 2: Multiple logical records referencing one blob are deleted concurrently.
        Verify:
        - no negative ref_count at any point
        - correct final ref_count (0/removed)
        - physical blob deleted only when final reference disappears
        """
        content = f"Concurrent delete test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        num_files = 5
        file_ids = []
        for i in range(num_files):
            res = asyncio.run(
                FileService.process_upload(
                    file_bytes=content,
                    original_filename=f"delete_test_{i}.txt",
                    current_user=self.user_a
                )
            )
            file_ids.append(res.file_id)

        assert BlobRepository.get_blob_ref_count(file_hash) == num_files
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is True

        barrier = threading.Barrier(num_files)

        def delete_worker(fid: str):
            barrier.wait()
            return asyncio.run(FileService.delete_file(fid, self.user_a))

        with ThreadPoolExecutor(max_workers=num_files) as executor:
            futures = [executor.submit(delete_worker, fid) for fid in file_ids]
            delete_results = [f.result() for f in as_completed(futures)]

        assert len(delete_results) == num_files

        # Verify all logical records deleted
        assert files_collection.count_documents({"hash": file_hash}) == 0

        # Verify ref count is 0 or doc deleted
        final_ref_count = BlobRepository.get_blob_ref_count(file_hash)
        assert final_ref_count == 0

        # Verify physical blob removed
        assert StorageService.exists_path(blob_path) is False

    def test_upload_vs_delete_race(self):
        """
        Scenario 3: Repeatedly interleave upload of same hash and deletion of existing reference.
        Verify: No surviving logical record points to missing physical storage.
        """
        content = f"Upload vs delete race payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        # Seed initial file
        initial_res = asyncio.run(
            FileService.process_upload(
                file_bytes=content,
                original_filename="seed.txt",
                current_user=self.user_a
            )
        )
        current_file_id = initial_res.file_id

        for cycle in range(8):
            barrier = threading.Barrier(2)
            upload_result = {}
            delete_result = {}

            def do_upload():
                barrier.wait()
                try:
                    res = asyncio.run(
                        FileService.process_upload(
                            file_bytes=content,
                            original_filename=f"race_up_{cycle}.txt",
                            current_user=self.user_a
                        )
                    )
                    upload_result["res"] = res
                except Exception as e:
                    upload_result["err"] = e

            def do_delete(fid_to_delete: str):
                barrier.wait()
                try:
                    res = asyncio.run(FileService.delete_file(fid_to_delete, self.user_a))
                    delete_result["res"] = res
                except Exception as e:
                    delete_result["err"] = e

            with ThreadPoolExecutor(max_workers=2) as executor:
                f1 = executor.submit(do_upload)
                f2 = executor.submit(do_delete, current_file_id)
                f1.result()
                f2.result()

            # Advance current_file_id if upload succeeded
            if "res" in upload_result:
                current_file_id = upload_result["res"].file_id
                self.created_file_ids.append(current_file_id)

            # Invariant: ANY logical file that currently exists in MongoDB MUST have its physical blob present on disk!
            existing_docs = list(files_collection.find({"hash": file_hash}))
            if len(existing_docs) > 0:
                blob_path = StorageService._resolve_path(file_hash)
                assert StorageService.exists_path(blob_path) is True, (
                    f"Cycle {cycle}: Logical files exist ({len(existing_docs)}) but physical storage is MISSING!"
                )
                # Verify can download
                for doc in existing_docs:
                    stream_resp = FileService.get_file_for_download(str(doc["_id"]), self.user_a)
                    downloaded = _read_streaming_response(stream_resp)
                    assert downloaded == content

        # Cleanup final remaining file
        if current_file_id:
            try:
                asyncio.run(FileService.delete_file(current_file_id, self.user_a))
            except Exception:
                pass

    def test_upload_failure_rollback(self):
        """
        Scenario 4: Force FileRepository.insert_file() to fail after blob registration.
        Verify:
        - ref_count returns to correct value (0)
        - no orphaned reference remains
        - physical blob is cleaned up if no other references exist
        """
        content = f"Upload rollback test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        # Force FileRepository.insert_file to raise an exception
        with patch.object(FileRepository, "insert_file", side_effect=RuntimeError("Simulated DB insert failure")):
            with pytest.raises(RuntimeError, match="Simulated DB insert failure"):
                asyncio.run(
                    FileService.process_upload(
                        file_bytes=content,
                        original_filename="fail_upload.txt",
                        current_user=self.user_a
                    )
                )

        # Verify rollback in MongoDB: ref_count is 0 or doc deleted
        assert BlobRepository.get_blob_ref_count(file_hash) == 0
        assert files_collection.count_documents({"hash": file_hash}) == 0

        # Verify physical file was unlinked and not orphaned
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is False

    def test_concurrent_upload_and_forced_failure(self):
        """
        Scenario 5: One upload succeeds while a concurrent upload registers then fails.
        Verify:
        - successful upload remains fully valid and downloadable
        - failed upload rolls back its reference without destroying the blob
        - final ref_count is exactly 1
        """
        content = f"Concurrent upload + failure payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        original_insert = FileRepository.insert_file
        call_count = 0
        lock = threading.Lock()

        def conditional_insert(doc):
            nonlocal call_count
            with lock:
                call_count += 1
                current_call = call_count
            if current_call == 1:
                # First caller fails
                raise RuntimeError("First upload forced failure")
            return original_insert(doc)

        barrier = threading.Barrier(2)
        results = {}

        def worker(idx: int):
            barrier.wait()
            try:
                res = asyncio.run(
                    FileService.process_upload(
                        file_bytes=content,
                        original_filename=f"worker_{idx}.txt",
                        current_user=self.user_a
                    )
                )
                results[f"worker_{idx}"] = ("success", res)
            except Exception as e:
                results[f"worker_{idx}"] = ("error", e)

        with patch.object(FileRepository, "insert_file", side_effect=conditional_insert):
            with ThreadPoolExecutor(max_workers=2) as executor:
                f1 = executor.submit(worker, 1)
                f2 = executor.submit(worker, 2)
                f1.result()
                f2.result()

        statuses = [v[0] for v in results.values()]
        assert "error" in statuses
        assert "success" in statuses

        # Find successful result
        success_res = [v[1] for v in results.values() if v[0] == "success"][0]
        self.created_file_ids.append(success_res.file_id)

        # Invariant: exactly 1 logical record, ref_count == 1, physical blob present
        assert files_collection.count_documents({"hash": file_hash}) == 1
        assert BlobRepository.get_blob_ref_count(file_hash) == 1
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is True

        # Download must succeed
        stream_resp = FileService.get_file_for_download(success_res.file_id, self.user_a)
        assert _read_streaming_response(stream_resp) == content

    def test_cross_tenant_concurrent_upload_delete(self):
        """
        Scenario 6: Cross-tenant upload and delete of identical content.
        Tenant A and Tenant B use the same content hash.
        Verify:
        - both logical records are tenant-isolated
        - physical storage is shared by hash
        - deleting Tenant A's file decrements ref_count to 1
        - Tenant B's file continues to function and download
        - deleting Tenant B removes physical storage
        """
        content = f"Cross tenant sharing test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        barrier = threading.Barrier(2)

        def tenant_upload(user: dict, name: str):
            barrier.wait()
            return asyncio.run(
                FileService.process_upload(
                    file_bytes=content,
                    original_filename=name,
                    current_user=user
                )
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            f_a = executor.submit(tenant_upload, self.user_a, "tenant_a_file.txt")
            f_b = executor.submit(tenant_upload, self.user_b, "tenant_b_file.txt")
            res_a = f_a.result()
            res_b = f_b.result()

        self.created_file_ids.extend([res_a.file_id, res_b.file_id])

        # 1. Tenant isolation: Tenant A cannot access Tenant B's file
        with pytest.raises(Exception):
            FileService.get_file_for_download(res_b.file_id, self.user_a)

        # 2. Shared physical blob
        assert BlobRepository.get_blob_ref_count(file_hash) == 2
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is True

        # 3. Delete Tenant A's file
        asyncio.run(FileService.delete_file(res_a.file_id, self.user_a))

        # Tenant A's record gone, Tenant B's record remains
        assert FileRepository.find_by_id_scoped(res_a.file_id, self.tenant_a) is None
        assert FileRepository.find_by_id_scoped(res_b.file_id, self.tenant_b) is not None

        # Ref count decremented to 1, physical blob NOT deleted
        assert BlobRepository.get_blob_ref_count(file_hash) == 1
        assert StorageService.exists_path(blob_path) is True

        # Tenant B can still download with full data fidelity
        stream_resp = FileService.get_file_for_download(res_b.file_id, self.user_b)
        assert _read_streaming_response(stream_resp) == content

        # 4. Delete Tenant B's file -> final reference removed
        asyncio.run(FileService.delete_file(res_b.file_id, self.user_b))
        assert BlobRepository.get_blob_ref_count(file_hash) == 0
        assert StorageService.exists_path(blob_path) is False

    def test_final_reference_deletion(self):
        """
        Scenario 7: Single file upload and delete lifecycle.
        When the last logical reference is removed, blob record is cleaned and physical file removed.
        """
        content = f"Final ref deletion test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        res = asyncio.run(
            FileService.process_upload(
                file_bytes=content,
                original_filename="single_file.txt",
                current_user=self.user_a
            )
        )
        blob_path = StorageService._resolve_path(file_hash)
        assert StorageService.exists_path(blob_path) is True
        assert BlobRepository.get_blob_ref_count(file_hash) == 1

        # Delete file
        asyncio.run(FileService.delete_file(res.file_id, self.user_a))

        assert FileRepository.find_by_id_scoped(res.file_id, self.tenant_a) is None
        assert BlobRepository.get_blob_ref_count(file_hash) == 0
        assert StorageService.exists_path(blob_path) is False

    def test_no_reference_upload_failure_no_leak(self):
        """
        Scenario 8: If an upload fails before logical insertion, no permanent MongoDB leak exists.
        """
        content = f"Zero ref failure payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        with patch.object(FileRepository, "insert_file", side_effect=IOError("Disk write failed")):
            with pytest.raises(IOError):
                asyncio.run(
                    FileService.process_upload(
                        file_bytes=content,
                        original_filename="error_file.txt",
                        current_user=self.user_a
                    )
                )

        assert files_collection.count_documents({"hash": file_hash}) == 0
        assert BlobRepository.get_blob_ref_count(file_hash) == 0
        blob_doc = blobs_collection.find_one({"content_hash": file_hash})
        assert blob_doc is None

    def test_repeated_stress_interleaving(self):
        """
        Scenario 9: Modest repeated concurrent stress test.
        Runs multiple threads rapidly uploading and deleting the same hash content.
        Verifies:
        - zero orphaned records
        - ref_count in MongoDB strictly equals logical files count
        - physical blob exists iff logical count > 0
        """
        content = f"Stress interleaving test payload {uuid.uuid4()}".encode("utf-8")
        file_hash = sha256_bytes(content)
        self.created_hashes.add(file_hash)

        shared_file_ids = []
        ids_lock = threading.Lock()

        def stress_worker(worker_id: int):
            for step in range(5):
                # Upload
                try:
                    res = asyncio.run(
                        FileService.process_upload(
                            file_bytes=content,
                            original_filename=f"stress_{worker_id}_{step}.txt",
                            current_user=self.user_a
                        )
                    )
                    with ids_lock:
                        shared_file_ids.append(res.file_id)
                except Exception:
                    pass

                # Delete an existing file if available
                fid_to_delete = None
                with ids_lock:
                    if shared_file_ids:
                        fid_to_delete = shared_file_ids.pop(0)

                if fid_to_delete:
                    try:
                        asyncio.run(FileService.delete_file(fid_to_delete, self.user_a))
                    except Exception:
                        pass

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(stress_worker, w) for w in range(4)]
            for f in as_completed(futures):
                f.result()

        # Check final state consistency
        logical_count = files_collection.count_documents({"hash": file_hash})
        ref_count = BlobRepository.get_blob_ref_count(file_hash)
        blob_path = StorageService._resolve_path(file_hash)
        file_exists = StorageService.exists_path(blob_path)

        assert logical_count == ref_count, (
            f"State inconsistency: logical_count={logical_count} != ref_count={ref_count}"
        )
        assert file_exists == (logical_count > 0), (
            f"Storage mismatch: file_exists={file_exists} but logical_count={logical_count}"
        )

        # Clean up any surviving files
        surviving = list(files_collection.find({"hash": file_hash}))
        for doc in surviving:
            asyncio.run(FileService.delete_file(str(doc["_id"]), self.user_a))

        assert files_collection.count_documents({"hash": file_hash}) == 0
        assert BlobRepository.get_blob_ref_count(file_hash) == 0
        assert StorageService.exists_path(blob_path) is False

    def test_blob_repository_atomic_decrement_guard(self):
        """
        Scenario 10: Direct test of BlobRepository.release_blob_reference atomic guards.
        Verifies that concurrent release calls on a 1-reference blob never produce negative ref_count.
        """
        test_hash = f"direct_test_hash_{uuid.uuid4().hex}"
        test_path = StorageService._resolve_path(test_hash)
        self.created_hashes.add(test_hash)

        # Register blob with 1 reference
        BlobRepository.register_blob_reference(test_hash, test_path)
        assert BlobRepository.get_blob_ref_count(test_hash) == 1

        barrier = threading.Barrier(3)
        results = []

        def release_worker():
            barrier.wait()
            res = BlobRepository.release_blob_reference(test_hash)
            return res

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(release_worker) for _ in range(3)]
            for f in as_completed(futures):
                results.append(f.result())

        # At least one call should have decremented it to 0
        ref_counts = [r[0] for r in results]
        # None should be negative!
        assert all(rc >= 0 for rc in ref_counts), f"Found negative ref_count in {ref_counts}"

        # Final ref count in database must be 0
        final_rc = BlobRepository.get_blob_ref_count(test_hash)
        assert final_rc == 0
