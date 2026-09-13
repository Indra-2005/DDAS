"""
Perceptual hashing for image near-duplicate detection.
Uses difference hash (dHash) for O(1) comparison of image similarity,
independent of the text-based MinHash/LSH pipeline.
"""
import io
import os
from typing import Optional, Tuple, List
from PIL import Image

# Image extensions that support perceptual hashing
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'}


def compute_dhash(image_bytes: bytes, hash_size: int = 16) -> Optional[str]:
    """
    Computes a difference hash (dHash) for an image.
    Produces a (hash_size * hash_size)-bit hex string.
    
    Algorithm:
        1. Convert to grayscale
        2. Resize to (hash_size+1) x hash_size
        3. Compare adjacent pixel intensities horizontally
        4. Encode as hex string
    
    Returns None if the image cannot be decoded.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as raw_img:
            img = raw_img.convert('L')
            img = img.resize((hash_size + 1, hash_size), Image.LANCZOS)
            pixels = list(img.getdata())
            img.close()
        width = hash_size + 1

        bits = []
        for row in range(hash_size):
            for col in range(hash_size):
                left = pixels[row * width + col]
                right = pixels[row * width + col + 1]
                bits.append(1 if left > right else 0)

        # Convert bits to hex string
        hash_int = 0
        for bit in bits:
            hash_int = (hash_int << 1) | bit

        hex_length = (hash_size * hash_size) // 4
        return format(hash_int, f'0{hex_length}x')
    except Exception:
        return None


def hamming_distance(hash1: str, hash2: str) -> int:
    """
    Computes the Hamming distance between two hex hash strings.
    Returns the number of differing bits.
    """
    if len(hash1) != len(hash2):
        return -1

    val1 = int(hash1, 16)
    val2 = int(hash2, 16)
    xor = val1 ^ val2
    return bin(xor).count('1')


def image_similarity_percent(hash1: str, hash2: str, hash_size: int = 16) -> float:
    """
    Computes similarity percentage between two dHash values.
    Returns a float from 0.0 (completely different) to 100.0 (identical).
    """
    total_bits = hash_size * hash_size
    dist = hamming_distance(hash1, hash2)
    if dist < 0:
        return 0.0
    return round((1 - dist / total_bits) * 100, 2)


def is_image_file(filename: str) -> bool:
    """Returns True if the filename has an image extension."""
    ext = os.path.splitext(filename.lower())[1]
    return ext in IMAGE_EXTENSIONS


def find_image_near_duplicate(
    query_hash: str,
    candidate_records: list,
    threshold: float = 90.0,
    hash_size: int = 16
) -> Tuple[bool, float, Optional[str]]:
    """
    Finds the best perceptual match among candidate records.
    
    Args:
        query_hash: dHash of the query image
        candidate_records: list of dicts with '_id' and 'image_dhash' keys
        threshold: minimum similarity percentage to flag as near-duplicate
        hash_size: hash grid size used for dHash computation
    
    Returns:
        (is_near_duplicate, similarity_percent, matched_file_id)
    """
    if not query_hash or not candidate_records:
        return False, 0.0, None

    best_sim = 0.0
    best_id = None

    for doc in candidate_records:
        stored_hash = doc.get("image_dhash")
        if not stored_hash:
            continue

        sim = image_similarity_percent(query_hash, stored_hash, hash_size)
        if sim > best_sim:
            best_sim = sim
            best_id = str(doc["_id"])

    if best_sim >= threshold:
        return True, best_sim, best_id

    return False, best_sim, None


def compute_dhash_buckets(dhash: str, num_blocks: int = 32) -> List[str]:
    """
    Partitions a 64-character (256-bit) dHash into 32 8-bit (2-hex) bucket tokens
    for sub-linear candidate discovery via the Pigeonhole Principle.
    
    With threshold=90.0%, max bit differences r <= 25.
    Since r=25 < num_blocks=32, any near-duplicate is guaranteed to match on at least
    32 - 25 = 7 bucket tokens (zero false negatives).
    """
    if not dhash or len(dhash) < 2:
        return []
    step = max(1, len(dhash) // num_blocks)
    buckets = []
    for i in range(num_blocks):
        start = i * step
        end = start + step if i < num_blocks - 1 else len(dhash)
        buckets.append(f"{i}:{dhash[start:end]}")
    return buckets

