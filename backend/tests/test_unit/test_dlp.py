"""
Unit tests for DLP scanning, Luhn algorithm, confidence scoring, masking, and redaction.
"""
from app.services.dlp_service import DLPService, luhn_verify

def test_luhn_algorithm():
    # Valid Visa card
    assert luhn_verify("4111111111111111") is True
    # Invalid card number
    assert luhn_verify("4111111111111112") is False
    # Empty / too short
    assert luhn_verify("12345") is False

def test_dlp_credit_card_detection():
    sample = "Payment processing card: 4111111111111111 exp 12/28"
    res = DLPService.scan_text(sample)
    assert res.has_violations is True
    assert "Credit Card" in res.violations
    assert res.quarantine_required is True
    assert len(res.findings) == 1
    assert res.findings[0].masked_value == "**** **** **** 1111"
    assert res.findings[0].confidence == 0.99

def test_dlp_aws_key_detection():
    sample = "Deploying to AWS using AKIAIOSFODNN7EXAMPLE key"
    res = DLPService.scan_text(sample)
    assert res.has_violations is True
    assert "AWS Access Key" in res.violations
    assert res.quarantine_required is True

def test_dlp_github_token_detection():
    sample = "export GITHUB_TOKEN=ghp_0123456789abcdefghijklmnopqrstuvwxyz"
    res = DLPService.scan_text(sample)
    assert res.has_violations is True
    assert "GitHub Token" in res.violations
    assert res.quarantine_required is True

def test_dlp_ssn_detection():
    sample = "Employee SSN is 123-45-6789 on record."
    res = DLPService.scan_text(sample)
    assert res.has_violations is True
    assert "SSN" in res.violations
    assert res.findings[0].masked_value == "***-**-6789"

def test_dlp_email_detection():
    sample = "Contact security team at security-audit@company.org."
    res = DLPService.scan_text(sample)
    assert res.has_violations is True
    assert "Email" in res.violations
    # Email is LOW severity -> does not mandate quarantine by default
    assert res.quarantine_required is False

def test_dlp_redaction():
    sample = "Billing invoice for user@ddas.io with card 4111111111111111 and key AKIAIOSFODNN7EXAMPLE"
    redacted = DLPService.redact_text(sample)
    assert "4111111111111111" not in redacted
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "[REDACTED_CREDIT_CARD]" in redacted
    assert "[REDACTED_AWS_ACCESS_KEY]" in redacted
