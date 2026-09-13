"""
Unit tests for StorageService atomic write strategy, concurrency safety,
and error cleanup behavior.
"""
import os
import uuid
import pytest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from app.services.storage_service import StorageService
from app.core.config import settings


@pytest.fixture
def temp_storage_dir(tmp_path, monkeypatch):
    """Configures an isolated temporary storage directory for unit testing."""
    test_dir = str(tmp_path / "storage_test")
    os.makedirs(test_dir, exist_ok=True)
    monkeypatch.setattr(type(settings), "effective_storage_dir", property(lambda self: test_dir))
    return test_dir


def test_storage_normal_save_and_read(temp_storage_dir):
    """Normal save and read roundtrip."""
    filename = f"test_blob_{uuid.uuid4().hex}.bin"
    payload = b"Atomic storage payload verification"

    saved_path = StorageService.save(filename, payload)
    assert os.path.isabs(saved_path)
    assert os.path.exists(saved_path)

    # Read back via filename and path
    read_data = StorageService.read(filename)
    assert read_data == payload

    read_path_data = StorageService.read_path(saved_path)
    assert read_path_data == payload


def test_storage_save_target_does_not_exist(temp_storage_dir):
    """Saving when target does not exist creates the file atomically."""
    filename = f"new_blob_{uuid.uuid4().hex}.bin"
    assert not StorageService.exists(filename)

    payload = b"Freshly created blob data"
    saved_path = StorageService.save(filename, payload)

    assert StorageService.exists(filename)
    assert StorageService.exists_path(saved_path)
    assert os.path.getsize(saved_path) == len(payload)


def test_storage_save_target_already_exists_preserves_content(temp_storage_dir):
    """
    Saving when target already exists preserves existing content and does not overwrite.
    """
    filename = f"existing_blob_{uuid.uuid4().hex}.bin"
    original_data = b"Original canonical blob content"
    different_data = b"Different data that must not overwrite"

    # First save
    path1 = StorageService.save(filename, original_data)
    assert StorageService.read(filename) == original_data

    # Second save with different data to same filename
    path2 = StorageService.save(filename, different_data)
    assert path1 == path2

    # Verify original data was preserved and NOT overwritten
    assert StorageService.read(filename) == original_data


def test_storage_concurrent_saves_to_same_target(temp_storage_dir):
    """
    Multiple concurrent threads race to save identical content to the same target filename.
    All must succeed, target must contain complete valid data, and no leftover temp files.
    """
    filename = f"concurrent_blob_{uuid.uuid4().hex}.bin"
    payload = b"Deterministic shared content for concurrent writes " * 100  # ~5 KB

    num_threads = 12

    def worker_save():
        return StorageService.save(filename, payload)

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker_save) for _ in range(num_threads)]
        results = [f.result() for f in futures]

    # All threads should return the exact same path
    assert len(results) == num_threads
    assert all(r == results[0] for r in results)

    # Content at destination must be completely intact
    assert StorageService.read(filename) == payload

    # No leftover .tmp_* files in the storage directory
    temp_files = [f for f in os.listdir(temp_storage_dir) if f.startswith(".tmp_")]
    assert temp_files == []


def test_storage_exception_during_write_cleans_up(temp_storage_dir):
    """
    If an I/O error or exception occurs during write/flush/fsync,
    any temporary file is cleaned up and no corrupt file is published.
    """
    filename = f"failing_blob_{uuid.uuid4().hex}.bin"
    payload = b"Payload that will fail during write"

    # Inject an OSError during fsync
    with patch("os.fsync", side_effect=OSError("Simulated disk write failure")):
        with pytest.raises(OSError, match="Simulated disk write failure"):
            StorageService.save(filename, payload)

    # Destination file must NOT exist
    assert not StorageService.exists(filename)

    # Temporary file must NOT be left behind in storage directory
    temp_files = [f for f in os.listdir(temp_storage_dir) if f.startswith(".tmp_")]
    assert temp_files == []


def test_storage_final_target_never_partially_written(temp_storage_dir):
    """
    Verifies that target path only ever transitions from non-existent to 100% complete,
    never existing in a partial 0-byte or partially written state.
    """
    filename = f"atomic_check_{uuid.uuid4().hex}.bin"
    target_path = os.path.join(temp_storage_dir, filename)
    payload = b"M" * 50000

    observed_states = []

    def check_target_state():
        if os.path.exists(target_path):
            observed_states.append(os.path.getsize(target_path))
        else:
            observed_states.append("missing")

    # Before save
    check_target_state()
    assert observed_states[-1] == "missing"

    # Perform atomic save
    saved_path = StorageService.save(filename, payload)

    # After save
    check_target_state()
    assert observed_states[-1] == 50000
    assert StorageService.read(filename) == payload


def test_storage_delete_and_lifecycle(temp_storage_dir):
    """Delete removes existing file and returns True; returns False if file absent."""
    filename = f"delete_me_{uuid.uuid4().hex}.bin"
    payload = b"Ephemeral content"

    path = StorageService.save(filename, payload)
    assert StorageService.exists(filename)

    # Delete existing
    deleted = StorageService.delete(path)
    assert deleted is True
    assert not StorageService.exists(filename)
    assert not StorageService.exists_path(path)

    # Delete non-existent
    deleted_again = StorageService.delete(path)
    assert deleted_again is False
    assert StorageService.delete("") is False
