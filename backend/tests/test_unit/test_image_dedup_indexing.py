"""
Unit and integration tests for perceptual image hashing candidate indexing,
multi-index bucket generation, tenant isolation, and exact Hamming distance verification.
"""
import pytest
from bson import ObjectId
from app.algorithms.perceptual_hash import (
    compute_dhash,
    compute_dhash_buckets,
    hamming_distance,
    image_similarity_percent,
    find_image_near_duplicate
)
from app.repositories.file_repository import FileRepository
from app.db.database import files_collection


# ---------------------------------------------------------------------------
# Unit tests for compute_dhash_buckets
# ---------------------------------------------------------------------------

def test_compute_dhash_buckets_structure():
    """Generates exactly 32 position-indexed bucket tokens for a 64-char dHash."""
    sample_hash = "0123456789abcdef" * 4  # 64 hex characters
    buckets = compute_dhash_buckets(sample_hash)

    assert len(buckets) == 32
    assert buckets[0] == "0:01"
    assert buckets[1] == "1:23"
    assert buckets[31] == "31:ef"


def test_compute_dhash_buckets_empty_and_short():
    """Invalid or empty dHash returns an empty bucket list."""
    assert compute_dhash_buckets("") == []
    assert compute_dhash_buckets("a") == []


def test_compute_dhash_buckets_pigeonhole_guarantee():
    """
    Mathematical verification of Pigeonhole Principle:
    At 90.0% threshold, max differing bits r <= 25.
    Distributing 25 bit flips across 32 8-bit blocks guarantees at least 7 blocks match exactly.
    """
    base_val = 0x0
    # Flip 25 bits: one bit in each of the first 25 blocks (bits 0, 8, 16, ..., 192)
    flipped_val = 0
    for block_idx in range(25):
        flipped_val |= (1 << (block_idx * 8))

    h1 = format(base_val, "064x")
    h2 = format(flipped_val, "064x")

    dist = hamming_distance(h1, h2)
    assert dist == 25  # Exactly 25 bits differ (90.23% similarity)
    assert image_similarity_percent(h1, h2) >= 90.0

    b1 = set(compute_dhash_buckets(h1))
    b2 = set(compute_dhash_buckets(h2))

    common_buckets = b1.intersection(b2)
    # Must have at least 32 - 25 = 7 matching bucket tokens
    assert len(common_buckets) >= 7


# ---------------------------------------------------------------------------
# Integration tests for candidate discovery in MongoDB
# ---------------------------------------------------------------------------

@pytest.fixture
def clean_image_files(test_tenants):
    """Ensures test image documents are cleaned up after testing."""
    ta = test_tenants["tenant_a"]
    tb = test_tenants["tenant_b"]
    yield {"tenant_a": ta, "tenant_b": tb}
    files_collection.delete_many({"company": {"$in": [ta, tb]}})


def test_image_candidate_exact_match(clean_image_files):
    """1. Exact dHash match is discovered via bucket indexing."""
    ta = clean_image_files["tenant_a"]
    h1 = "a" * 64
    buckets1 = compute_dhash_buckets(h1)

    file_doc = {
        "filename": "original.png",
        "company": ta,
        "image_dhash": h1,
        "dhash_buckets": buckets1
    }
    inserted_id = str(files_collection.insert_one(file_doc).inserted_id)

    # Query candidates with same hash
    candidates = FileRepository.get_tenant_image_candidates(ta, buckets1)
    assert any(str(c["_id"]) == inserted_id for c in candidates)

    is_dup, sim, match_id = find_image_near_duplicate(h1, candidates)
    assert is_dup is True
    assert sim == 100.0
    assert match_id == inserted_id


def test_image_candidate_near_match_within_threshold(clean_image_files):
    """2. Image within Hamming-distance threshold is discovered and verified."""
    ta = clean_image_files["tenant_a"]
    h1 = "0" * 64

    # Flip 8 bits (Hamming distance = 8 -> 96.88% similarity)
    # Flip lowest bit of the first 8 blocks
    flipped_int = sum(1 << (i * 8) for i in range(8))
    h2 = format(flipped_int, "064x")
    assert image_similarity_percent(h1, h2) >= 90.0

    buckets1 = compute_dhash_buckets(h1)
    buckets2 = compute_dhash_buckets(h2)

    doc_id = str(files_collection.insert_one({
        "filename": "base_image.png",
        "company": ta,
        "image_dhash": h1,
        "dhash_buckets": buckets1
    }).inserted_id)

    candidates = FileRepository.get_tenant_image_candidates(ta, buckets2)
    assert any(str(c["_id"]) == doc_id for c in candidates)

    is_dup, sim, match_id = find_image_near_duplicate(h2, candidates)
    assert is_dup is True
    assert sim >= 90.0
    assert match_id == doc_id


def test_image_candidate_outside_threshold_not_reported(clean_image_files):
    """3. Image outside the threshold is NOT reported as a near duplicate."""
    ta = clean_image_files["tenant_a"]
    h1 = "0" * 64
    h_dissimilar = "f" * 64  # 256 bits differ (0% similarity)

    files_collection.insert_one({
        "filename": "black.png",
        "company": ta,
        "image_dhash": h1,
        "dhash_buckets": compute_dhash_buckets(h1)
    })

    query_buckets = compute_dhash_buckets(h_dissimilar)
    candidates = FileRepository.get_tenant_image_candidates(ta, query_buckets)

    is_dup, sim, match_id = find_image_near_duplicate(h_dissimilar, candidates)
    assert is_dup is False
    assert match_id is None


def test_image_candidate_tenant_isolation(clean_image_files):
    """4. Tenant A must NEVER see or match Tenant B's images."""
    ta = clean_image_files["tenant_a"]
    tb = clean_image_files["tenant_b"]
    shared_hash = "5" * 64
    buckets = compute_dhash_buckets(shared_hash)

    # Insert for Tenant B only
    files_collection.insert_one({
        "filename": "tenant_b_image.png",
        "company": tb,
        "image_dhash": shared_hash,
        "dhash_buckets": buckets
    })

    # Query as Tenant A
    candidates = FileRepository.get_tenant_image_candidates(ta, buckets)
    # Must return ZERO candidates for Tenant A
    assert len(candidates) == 0

    is_dup, sim, match_id = find_image_near_duplicate(shared_hash, candidates)
    assert is_dup is False
    assert match_id is None


def test_image_candidate_shares_bucket_but_exceeds_threshold_rejected(clean_image_files):
    """
    6. Candidate shares 1 bucket token by coincidence, but overall bit differences
    exceed the 90.0% threshold. Exact verification must reject it.
    """
    ta = clean_image_files["tenant_a"]
    # 64 hex characters: Block 0 is "aa", all remaining blocks are "00"
    h1 = "aa" + "00" * 31
    # Candidate: Block 0 is "aa" (matches bucket 0), but all other blocks are "ff" (huge distance)
    h_candidate = "aa" + "ff" * 31

    # Similarity is ~50%, far below 90%
    assert image_similarity_percent(h1, h_candidate) < 90.0

    doc_id = str(files_collection.insert_one({
        "filename": "coincidental_bucket.png",
        "company": ta,
        "image_dhash": h_candidate,
        "dhash_buckets": compute_dhash_buckets(h_candidate)
    }).inserted_id)

    # Candidate discovery finds it because block 0 matches ("0:aa")
    query_buckets = compute_dhash_buckets(h1)
    candidates = FileRepository.get_tenant_image_candidates(ta, query_buckets)
    assert any(str(c["_id"]) == doc_id for c in candidates)

    # Authoritative exact Hamming distance check MUST reject it
    is_dup, sim, match_id = find_image_near_duplicate(h1, candidates, threshold=90.0)
    assert is_dup is False
    assert match_id is None


def test_image_candidate_legacy_records_backward_compatibility(clean_image_files):
    """
    8. Legacy records in database that lack dhash_buckets must still be discovered.
    """
    ta = clean_image_files["tenant_a"]
    h1 = "7" * 64

    # Insert legacy record WITHOUT dhash_buckets field
    doc_id = str(files_collection.insert_one({
        "filename": "legacy_image.png",
        "company": ta,
        "image_dhash": h1
        # Note: no dhash_buckets field
    }).inserted_id)

    query_buckets = compute_dhash_buckets(h1)
    candidates = FileRepository.get_tenant_image_candidates(ta, query_buckets)
    assert any(str(c["_id"]) == doc_id for c in candidates)

    is_dup, sim, match_id = find_image_near_duplicate(h1, candidates)
    assert is_dup is True
    assert sim == 100.0
    assert match_id == doc_id


def test_image_candidate_empty_database(clean_image_files):
    """9. Empty database safely returns 0 candidates without error."""
    ta = clean_image_files["tenant_a"]
    buckets = compute_dhash_buckets("3" * 64)

    candidates = FileRepository.get_tenant_image_candidates(ta, buckets)
    assert candidates == []

    is_dup, sim, match_id = find_image_near_duplicate("3" * 64, candidates)
    assert is_dup is False
    assert sim == 0.0
    assert match_id is None


def test_image_candidate_sublinear_filtering(clean_image_files):
    """
    7 & Performance: Demonstrates candidate discovery avoids returning dissimilar images.
    Inserts 20 dissimilar images and 1 near-duplicate. Candidate discovery must return
    only the relevant candidate, NOT all 21 records.
    """
    ta = clean_image_files["tenant_a"]
    base_hash = "0" * 64

    # Insert 1 near-duplicate (only 4 bits differ)
    near_hash = "0" * 60 + "000f"
    near_id = str(files_collection.insert_one({
        "filename": "near_dup.png",
        "company": ta,
        "image_dhash": near_hash,
        "dhash_buckets": compute_dhash_buckets(near_hash)
    }).inserted_id)

    # Insert 20 completely dissimilar images with patterns that do not collide with "0"
    for i in range(1, 21):
        # Generate non-colliding distinct patterns
        hex_char = format((i % 15) + 1, "x")
        dissimilar_hash = hex_char * 64
        files_collection.insert_one({
            "filename": f"dissimilar_{i}.png",
            "company": ta,
            "image_dhash": dissimilar_hash,
            "dhash_buckets": compute_dhash_buckets(dissimilar_hash)
        })

    # Total images for tenant = 21
    total_tenant_images = files_collection.count_documents({"company": ta})
    assert total_tenant_images == 21

    # Query for base_hash
    query_buckets = compute_dhash_buckets(base_hash)
    candidates = FileRepository.get_tenant_image_candidates(ta, query_buckets)

    # Candidates returned must be significantly fewer than total images
    assert len(candidates) < total_tenant_images
    assert any(str(c["_id"]) == near_id for c in candidates)

    # Exact Hamming verification confirms match
    is_dup, sim, match_id = find_image_near_duplicate(base_hash, candidates)
    assert is_dup is True
    assert match_id == near_id
