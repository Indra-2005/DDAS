"""
Deduplication service: exact SHA-256 matching, MinHash LSH text near-duplicate,
and dHash perceptual image near-duplicate detection.
"""
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel
from app.algorithms.minhash import build_minhash
from app.algorithms.lsh import find_near_duplicate
from app.algorithms.perceptual_hash import (
    compute_dhash, is_image_file, find_image_near_duplicate, compute_dhash_buckets
)
from app.db.database import files_collection
from app.repositories.file_repository import FileRepository
from app.core.config import settings

class DedupResult(BaseModel):
    is_duplicate: bool = False
    is_near_duplicate: bool = False
    similarity_score: float = 0.0
    compare_file_id: Optional[str] = None
    minhash_values: Optional[List[int]] = None
    image_dhash: Optional[str] = None
    dhash_buckets: Optional[List[str]] = None

class DedupService:
    @staticmethod
    def analyze_deduplication(
        file_hash: str,
        text: str,
        company: str,
        filename: str = "",
        file_bytes: bytes = b""
    ) -> DedupResult:
        """
        Executes tenant-scoped exact and near-duplicate checks.
        1. Exact duplicate check within company (SHA-256)
        2. Near-duplicate MinHash LSH search for text documents
        3. Perceptual dHash comparison for image files
        """
        is_duplicate = False
        is_near_duplicate = False
        similarity_score = 0.0
        compare_file_id = None
        minhash_values = None
        image_dhash = None

        # 1. Exact Duplicate Check (Scoped to tenant)
        exact_match = files_collection.find_one({"hash": file_hash, "company": company})
        if exact_match:
            is_duplicate = True

        # 2. Near-Duplicate Check — Text documents via MinHash/LSH
        if text:
            m = build_minhash(text)
            if m:
                minhash_values = [int(v) for v in m.hashvalues]
                candidates = FileRepository.get_tenant_minhash_candidates(company)
                if candidates:
                    is_near_dup, sim_pct, matched_id = find_near_duplicate(m, candidates)
                    if is_near_dup:
                        is_near_duplicate = True
                        similarity_score = sim_pct
                        compare_file_id = matched_id

        # 3. Near-Duplicate Check — Images via perceptual dHash
        dhash_buckets = None
        if filename and file_bytes and is_image_file(filename):
            image_dhash = compute_dhash(file_bytes)
            if image_dhash:
                dhash_buckets = compute_dhash_buckets(image_dhash)
                if not is_near_duplicate:
                    # Query tenant's image candidates using indexed multi-index buckets
                    img_candidates = FileRepository.get_tenant_image_candidates(
                        company, dhash_buckets
                    )
                    if img_candidates:
                        img_near, img_sim, img_match = find_image_near_duplicate(
                            image_dhash, img_candidates
                        )
                        if img_near:
                            is_near_duplicate = True
                            similarity_score = img_sim
                            compare_file_id = img_match

        return DedupResult(
            is_duplicate=is_duplicate,
            is_near_duplicate=is_near_duplicate,
            similarity_score=similarity_score,
            compare_file_id=compare_file_id,
            minhash_values=minhash_values,
            image_dhash=image_dhash,
            dhash_buckets=dhash_buckets
        )

