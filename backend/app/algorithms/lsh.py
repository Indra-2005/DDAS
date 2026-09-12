"""
Locality-Sensitive Hashing (LSH) index implementation for sub-linear near-duplicate matching.
"""
from typing import List, Dict, Any, Tuple, Optional
import numpy
from datasketch import MinHash, MinHashLSH
from app.core.config import settings
from app.algorithms.similarity import jaccard_from_stored

def find_near_duplicate(
    query_minhash: MinHash,
    candidate_records: List[Dict[str, Any]],
    threshold: Optional[float] = None,
    num_perm: Optional[int] = None
) -> Tuple[bool, float, Optional[str]]:
    """
    Finds if a near-duplicate exists within candidate records using LSH indexing
    followed by exact Jaccard similarity verification.
    
    Returns:
        (is_near_duplicate: bool, similarity_score_pct: float, matched_file_id: Optional[str])
    """
    if not candidate_records or query_minhash is None:
        return False, 0.0, None

    thresh = threshold if threshold is not None else settings.NEAR_DUP_THRESHOLD
    perms = num_perm or settings.MINHASH_NUM_PERM

    # Initialize LSH index
    lsh = MinHashLSH(threshold=thresh, num_perm=perms)

    # Populate LSH index with candidate records that possess minhash values
    valid_candidates: Dict[str, Dict[str, Any]] = {}
    for doc in candidate_records:
        stored_values = doc.get("minhash_values")
        if not stored_values:
            continue
        doc_id = str(doc["_id"])
        try:
            m = MinHash(num_perm=perms)
            m.hashvalues = numpy.array(stored_values, dtype='uint64')
            lsh.insert(doc_id, m)
            valid_candidates[doc_id] = doc
        except Exception:
            continue

    if not valid_candidates:
        return False, 0.0, None

    # Query LSH index for candidate buckets
    candidate_ids = lsh.query(query_minhash)
    if not candidate_ids:
        return False, 0.0, None

    # Exact Jaccard verification on candidates returned by LSH
    best_sim = 0.0
    best_match_id = None

    for cid in candidate_ids:
        doc = valid_candidates.get(cid)
        if not doc:
            continue
        sim = jaccard_from_stored(query_minhash, doc["minhash_values"], perms)
        if sim > best_sim:
            best_sim = sim
            best_match_id = cid

    if best_sim >= thresh:
        return True, round(best_sim * 100, 2), best_match_id

    return False, round(best_sim * 100, 2), None
