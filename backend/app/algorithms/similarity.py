"""
Exact Jaccard similarity computation using stored MinHash signatures.
"""
from typing import List, Optional
import numpy
from datasketch import MinHash
from app.core.config import settings

def jaccard_from_stored(m: MinHash, stored_hashvalues: List[int], num_perm: Optional[int] = None) -> float:
    """
    Reconstitutes a MinHash object from stored uint64 integer array
    and computes exact Jaccard similarity against another MinHash.
    """
    perms = num_perm or settings.MINHASH_NUM_PERM
    m2 = MinHash(num_perm=perms)
    m2.hashvalues = numpy.array(stored_hashvalues, dtype=m2.hashvalues.dtype)
    return float(m.jaccard(m2))
