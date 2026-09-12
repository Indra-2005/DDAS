"""
MinHash signature computation for near-duplicate text detection.
"""
import re
from typing import Optional
from datasketch import MinHash
from app.core.config import settings

def build_minhash(text: str, num_perm: Optional[int] = None) -> Optional[MinHash]:
    """
    Builds a MinHash signature from extracted text.
    Returns None if text contains no alphanumerical words.
    """
    if not text:
        return None

    perms = num_perm or settings.MINHASH_NUM_PERM
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    words = set(cleaned.split())
    words.discard('')

    if not words:
        return None

    m = MinHash(num_perm=perms)
    for word in words:
        m.update(word.encode('utf-8'))

    return m
