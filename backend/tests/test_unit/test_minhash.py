"""
Unit tests for MinHash signature generation.
"""
from app.algorithms.minhash import build_minhash

def test_build_minhash_valid_text():
    text = "The quick brown fox jumps over the lazy dog."
    m = build_minhash(text, num_perm=128)
    assert m is not None
    assert len(m.hashvalues) == 128

def test_build_minhash_empty():
    assert build_minhash("") is None
    assert build_minhash("   !@#$%^&*()   ") is None

def test_build_minhash_deterministic():
    text = "Deterministic deduplication system for multi-tenant cloud storage."
    m1 = build_minhash(text, num_perm=128)
    m2 = build_minhash(text, num_perm=128)
    assert list(m1.hashvalues) == list(m2.hashvalues)
