"""
Unit tests for Jaccard similarity and LSH candidate discovery.
"""
from bson import ObjectId
from app.algorithms.minhash import build_minhash
from app.algorithms.similarity import jaccard_from_stored
from app.algorithms.lsh import find_near_duplicate

def test_jaccard_identical():
    text = "Machine learning is strictly prohibited in this project architecture."
    m1 = build_minhash(text)
    assert m1 is not None
    stored_vals = [int(v) for v in m1.hashvalues]
    sim = jaccard_from_stored(m1, stored_vals)
    assert sim == 1.0

def test_jaccard_dissimilar():
    text1 = "Apples oranges bananas mangoes grapes pineapple strawberry watermelon."
    text2 = "Kubernetes docker terraform helm cloud native architecture deployment."
    m1 = build_minhash(text1)
    m2 = build_minhash(text2)
    assert m1 is not None and m2 is not None
    stored_vals = [int(v) for v in m2.hashvalues]
    sim = jaccard_from_stored(m1, stored_vals)
    assert sim < 0.2

def test_lsh_find_near_duplicate():
    base_text = "Data Download Duplication Alert System monitors files and alerts admins on duplicate documents."
    near_dup_text = "Data Download Duplication Alert System monitors files and alerts administrators on duplicate documents."
    diff_text = "Completely unrelated article on astrophysics and black hole event horizons in outer space."

    m_base = build_minhash(base_text)
    m_near = build_minhash(near_dup_text)
    m_diff = build_minhash(diff_text)
    assert m_base is not None and m_near is not None and m_diff is not None

    oid_near = str(ObjectId())
    oid_diff = str(ObjectId())

    candidates = [
        {"_id": oid_diff, "minhash_values": [int(v) for v in m_diff.hashvalues]},
        {"_id": oid_near, "minhash_values": [int(v) for v in m_near.hashvalues]}
    ]

    is_near, sim_pct, match_id = find_near_duplicate(m_base, candidates, threshold=0.7)
    assert is_near is True
    assert match_id == oid_near
    assert sim_pct >= 70.0
