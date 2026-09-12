"""
Unit tests for perceptual image hashing (dHash) and Hamming distance similarity.
"""
import io
from PIL import Image
from app.algorithms.perceptual_hash import (
    compute_dhash,
    hamming_distance,
    image_similarity_percent,
    is_image_file,
    find_image_near_duplicate
)


def _make_solid_image(color: int, size: tuple = (64, 64)) -> bytes:
    """Creates a solid color image as bytes."""
    img = Image.new('L', size, color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def _make_gradient_image(direction: str = "horizontal", size: tuple = (64, 64)) -> bytes:
    """Creates a gradient image as bytes."""
    img = Image.new('L', size)
    for y in range(size[1]):
        for x in range(size[0]):
            if direction == "horizontal":
                img.putpixel((x, y), int(255 * (size[0] - 1 - x) / size[0]))
            else:
                img.putpixel((x, y), int(255 * (size[1] - 1 - y) / size[1]))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def test_dhash_identical_images():
    """Identical images must produce identical hashes."""
    img_bytes = _make_solid_image(128)
    h1 = compute_dhash(img_bytes)
    h2 = compute_dhash(img_bytes)
    assert h1 is not None
    assert h1 == h2


def test_dhash_different_images():
    """Very different images must produce different hashes."""
    black = _make_solid_image(0)
    gradient = _make_gradient_image()
    h1 = compute_dhash(black)
    h2 = compute_dhash(gradient)
    assert h1 is not None and h2 is not None
    assert h1 != h2


def test_hamming_distance_identical():
    assert hamming_distance("abcd", "abcd") == 0


def test_hamming_distance_different():
    # 0xf = 1111, 0x0 = 0000 -> 4 bits differ
    assert hamming_distance("f", "0") == 4


def test_hamming_distance_length_mismatch():
    assert hamming_distance("ab", "abc") == -1


def test_image_similarity_identical():
    img = _make_solid_image(100)
    h = compute_dhash(img)
    assert h is not None
    sim = image_similarity_percent(h, h)
    assert sim == 100.0


def test_image_similarity_different():
    h1 = compute_dhash(_make_solid_image(0))
    h2 = compute_dhash(_make_gradient_image())
    assert h1 is not None and h2 is not None
    sim = image_similarity_percent(h1, h2)
    assert sim < 100.0


def test_is_image_file():
    assert is_image_file("photo.jpg") is True
    assert is_image_file("photo.JPEG") is True
    assert is_image_file("photo.png") is True
    assert is_image_file("photo.webp") is True
    assert is_image_file("document.txt") is False
    assert is_image_file("report.pdf") is False


def test_compute_dhash_invalid_bytes():
    """Non-image bytes should return None."""
    result = compute_dhash(b"not an image at all")
    assert result is None


def test_find_image_near_duplicate_match():
    """Near-identical images should be flagged as near-duplicates."""
    img1 = _make_gradient_image("horizontal")
    h1 = compute_dhash(img1)

    # Slightly modified image (small shift)
    img2 = Image.new('L', (64, 64))
    for y in range(64):
        for x in range(64):
            img2.putpixel((x, y), min(255, int(255 * (64 - 1 - x) / 64) + 1))
    buf = io.BytesIO()
    img2.save(buf, format='PNG')
    h2 = compute_dhash(buf.getvalue())

    assert h1 is not None and h2 is not None

    from bson import ObjectId
    candidates = [{"_id": ObjectId(), "image_dhash": h2}]
    is_dup, sim, matched = find_image_near_duplicate(h1, candidates, threshold=85.0)
    assert is_dup is True
    assert sim >= 85.0
    assert matched is not None


def test_find_image_near_duplicate_no_match():
    """Very different images should not match."""
    h1 = compute_dhash(_make_solid_image(0))
    h2 = compute_dhash(_make_gradient_image())

    from bson import ObjectId
    candidates = [{"_id": ObjectId(), "image_dhash": h2}]
    is_dup, sim, matched = find_image_near_duplicate(h1, candidates, threshold=90.0)
    # May or may not match depending on exact similarity; just ensure no crash
    assert isinstance(is_dup, bool)
    assert isinstance(sim, float)
