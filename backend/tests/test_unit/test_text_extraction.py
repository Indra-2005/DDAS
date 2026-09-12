"""
Unit tests for text extraction across plain-text and markup files.
"""
from app.algorithms.text_extraction import extract_text

def test_extract_text_plain():
    data = b"Plain text content for file deduplication analysis."
    result = extract_text(data, "sample.txt")
    assert result == "Plain text content for file deduplication analysis."

def test_extract_text_csv():
    data = b"id,name,role\n1,Alice,Admin\n2,Bob,User"
    result = extract_text(data, "users.csv")
    assert "Alice" in result
    assert "Admin" in result

def test_extract_text_html_tag_strip():
    data = b"<html><body><h1>Security Notice</h1><p>Confidential data inside.</p></body></html>"
    result = extract_text(data, "notice.html")
    assert "<html>" not in result
    assert "Security Notice" in result
    assert "Confidential data inside." in result

def test_extract_unsupported_extension():
    data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    result = extract_text(data, "image.png")
    assert result == ""
