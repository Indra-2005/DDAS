"""
Data Loss Prevention (DLP) engine.
Performs deterministic scanning for PII, secrets, credentials, and financial data.
Includes Luhn checksum validation, severity scoring, confidence estimation, and masking.
"""
import re
from typing import List, Dict, Any, Tuple
from app.schemas.dlp import DLPSeverity, DLPFinding, DLPScanResult

def luhn_verify(card_number_str: str) -> bool:
    """Validates credit card numbers using Luhn checksum algorithm."""
    digits_only = re.sub(r'\D', '', card_number_str)
    if len(digits_only) < 13 or len(digits_only) > 19:
        return False
    total = 0
    reversed_digits = digits_only[::-1]
    for i, char in enumerate(reversed_digits):
        n = int(char)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0

def mask_credit_card(val: str) -> str:
    digits = re.sub(r'\D', '', val)
    last4 = digits[-4:] if len(digits) >= 4 else "0000"
    return f"**** **** **** {last4}"

def mask_token(val: str) -> str:
    if len(val) <= 8:
        return "****"
    return val[:4] + "*" * (len(val) - 8) + val[-4:]

def mask_ssn(val: str) -> str:
    parts = val.split("-")
    if len(parts) == 3:
        return f"***-**-{parts[2]}"
    return "***-**-" + val[-4:]

def mask_email(val: str) -> str:
    if "@" in val:
        local, domain = val.split("@", 1)
        masked_local = local[0] + "***" + (local[-1] if len(local) > 1 else "")
        return f"{masked_local}@{domain}"
    return "******"

def mask_phone(val: str) -> str:
    digits = re.sub(r'\D', '', val)
    last4 = digits[-4:] if len(digits) >= 4 else "0000"
    return f"(***) ***-{last4}"

class DLPService:
    # Rule definitions: (rule_name, pattern, severity, base_confidence)
    RULES: List[Tuple[str, re.Pattern, DLPSeverity, float]] = [
        (
            "Credit Card",
            re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b'),
            DLPSeverity.CRITICAL,
            0.99
        ),
        (
            "AWS Access Key",
            re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
            DLPSeverity.CRITICAL,
            0.98
        ),
        (
            "GitHub Token",
            re.compile(r'\bgh[pousr]_[A-Za-z0-9_]{36,}\b'),
            DLPSeverity.CRITICAL,
            0.98
        ),
        (
            "API Key",
            re.compile(r'(?i)(?:api[_-]?key|secret|token|bearer)[\s:=]+[\'"]?([a-zA-Z0-9_\-]{20,})[\'"]?'),
            DLPSeverity.HIGH,
            0.85
        ),
        (
            "SSN",
            re.compile(r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b'),
            DLPSeverity.HIGH,
            0.95
        ),
        (
            "IBAN",
            re.compile(r'\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b'),
            DLPSeverity.HIGH,
            0.90
        ),
        (
            "Phone Number",
            re.compile(r'\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
            DLPSeverity.MEDIUM,
            0.85
        ),
        (
            "Email",
            re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            DLPSeverity.LOW,
            0.95
        ),
    ]

    @classmethod
    def scan_text(cls, text: str) -> DLPScanResult:
        """
        Scans text deterministically against all configured DLP patterns.
        Computes severity and flags quarantine if any HIGH or CRITICAL rules match.
        """
        if not text:
            return DLPScanResult(has_violations=False, violations=[], findings=[], quarantine_required=False)

        matched_rules = set()
        findings: List[DLPFinding] = []
        quarantine_required = False

        for rule_name, pattern, severity, base_confidence in cls.RULES:
            for match in pattern.finditer(text):
                raw_val = match.group(0)
                location = match.start()
                confidence = base_confidence

                # Extra validation for specific patterns
                if rule_name == "Credit Card":
                    is_valid_luhn = luhn_verify(raw_val)
                    if not is_valid_luhn:
                        # Downgrade confidence if not passing Luhn check
                        confidence = 0.70
                    masked = mask_credit_card(raw_val)
                elif rule_name in ("AWS Access Key", "GitHub Token", "API Key"):
                    masked = mask_token(raw_val)
                elif rule_name == "SSN":
                    masked = mask_ssn(raw_val)
                elif rule_name == "Phone Number":
                    masked = mask_phone(raw_val)
                elif rule_name == "Email":
                    masked = mask_email(raw_val)
                else:
                    masked = "[REDACTED]"

                matched_rules.add(rule_name)
                findings.append(DLPFinding(
                    rule_name=rule_name,
                    severity=severity,
                    confidence=confidence,
                    masked_value=masked,
                    location=location
                ))

                if severity in (DLPSeverity.HIGH, DLPSeverity.CRITICAL):
                    quarantine_required = True

        return DLPScanResult(
            has_violations=len(findings) > 0,
            violations=sorted(list(matched_rules)),
            findings=findings,
            quarantine_required=quarantine_required
        )

    @classmethod
    def redact_text(cls, text: str) -> str:
        """
        Redacts all sensitive DLP matches in plain text with deterministic replacement tokens.
        """
        redacted = text
        for rule_name, pattern, severity, _ in cls.RULES:
            token = f"[REDACTED_{rule_name.upper().replace(' ', '_')}]"
            redacted = pattern.sub(token, redacted)
        return redacted
