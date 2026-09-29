"""Security and Defense-in-Depth Module for Ambient Guardian MCP Server.

Provides:
- HTTP Bearer Token verification for MCP endpoints (/mcp/v1/*).
- Prompt Injection & Indirect Jailbreak detection on tool parameters.
- Canary token generation and exfiltration detection.
- PII scrubbing and data minimization for health telemetry.
"""

from __future__ import annotations

import hmac
import os
import re
import secrets
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, Header, status

# Default development token; in production, injected via AWS Secrets Manager or KMS
DEFAULT_MCP_TOKEN = os.getenv("MCP_BEARER_TOKEN", "ambient-guardian-secret-token-2026")

# Regular expression patterns for adversarial prompt injection detection
ADVERSARIAL_PATTERNS: List[re.Pattern] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)", re.IGNORECASE),
    re.compile(r"(disregard|forget|override)\s+(your\s+)?(system\s+)?(prompt|rules|safeguards)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+developer\s+mode|unrestricted|DAN|a\s+hacker)", re.IGNORECASE),
    re.compile(r"(print|reveal|output|display|show|leak)\s+(the\s+)?(system\s+prompt|canary|secret|hidden\s+instructions)", re.IGNORECASE),
    re.compile(r"<\/?(system|assistant|human|context|instructions|prompt)>", re.IGNORECASE),
    re.compile(r"(\[INST\]|\[\/INST\]|<<SYS>>|<\/s>|<s>)", re.IGNORECASE),
    re.compile(r"```(python|bash|sh|powershell)?\s*(import\s+os|system\(|eval\(|exec\()", re.IGNORECASE),
    re.compile(r"(base64_decode|eval|exec|subprocess)\b", re.IGNORECASE),
    re.compile(r"(\u200B|\u200C|\u200D|\uFEFF)", re.UNICODE),  # Zero-width / invisible characters
]

# Patterns for PII masking (telemetry anonymization)
PHONE_REGEX = re.compile(r"\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")


class SecurityValidationError(HTTPException):
    """Raised when incoming tool parameters fail prompt injection or sanitization checks."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"[SECURITY_DEFENSE_TRIGGERED] {detail}",
        )


def verify_bearer_token(authorization: Optional[str] = Header(None)) -> str:
    """Validates HTTP Bearer token using constant-time string comparison.

    Required by Spec 2025-11-25 for authenticated Streamable HTTP MCP transports.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. MCP Spec 2025-11-25 requires 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    provided_token = parts[1]
    expected_token = os.getenv("MCP_BEARER_TOKEN", DEFAULT_MCP_TOKEN)

    if not hmac.compare_digest(provided_token.encode("utf-8"), expected_token.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid MCP Bearer token",
        )

    return provided_token


def sanitize_text_input(field_name: str, value: Any, max_length: int = 500) -> str:
    """Sanitizes single text input against prompt injections, control characters, and overflow.

    Args:
        field_name: Name of tool parameter for logging
        value: Input value
        max_length: Maximum allowed string length

    Returns:
        Cleaned string if safe

    Raises:
        SecurityValidationError: If adversarial patterns or violations are detected
    """
    if value is None:
        return ""

    if not isinstance(value, str):
        value = str(value)

    # 1. Length check
    if len(value) > max_length:
        raise SecurityValidationError(
            f"Field '{field_name}' exceeds maximum permitted length of {max_length} characters."
        )

    # 2. Check for null bytes or control characters (except newline, tab, carriage return)
    if any(ord(c) < 32 and c not in "\n\r\t" for c in value):
        raise SecurityValidationError(
            f"Field '{field_name}' contains disallowed ASCII control characters."
        )

    # 3. Check for prompt injection / jailbreak patterns
    for pattern in ADVERSARIAL_PATTERNS:
        match = pattern.search(value)
        if match:
            raise SecurityValidationError(
                f"Field '{field_name}' contains potentially malicious instruction pattern: '{match.group()}'"
            )

    # 4. Strip extra surrounding whitespace
    return value.strip()


def sanitize_tool_arguments(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively validates and sanitizes all tool arguments passed from Alexa+ client."""
    sanitized: Dict[str, Any] = {}

    for key, val in arguments.items():
        if isinstance(val, str):
            sanitized[key] = sanitize_text_input(key, val)
        elif isinstance(val, (int, float, bool)):
            sanitized[key] = val
        elif isinstance(val, list):
            sanitized[key] = [
                sanitize_text_input(f"{key}[{i}]", item) if isinstance(item, str) else item
                for i, item in enumerate(val)
            ]
        elif isinstance(val, dict):
            sanitized[key] = sanitize_tool_arguments(val)
        else:
            sanitized[key] = str(val)

    return sanitized


def generate_canary_token(session_id: str = "") -> str:
    """Generates a secure, cryptographically random canary token embedded in Bedrock prompts.

    Allows detection of prompt leakages or prompt extraction attacks.
    """
    random_hex = secrets.token_hex(8)
    return f"CANARY_AMB_{session_id[:6]}_{random_hex}"


def detect_canary_leakage(response_text: str, canary: str) -> bool:
    """Checks whether the Bedrock LLM response contains the hidden canary token.

    If true, indicates the model output has been compromised by prompt extraction.
    """
    if not canary:
        return False
    return canary in response_text


def scrub_pii(text: str) -> str:
    """Masks personally identifiable information (PII) before transmission or telemetry logging.

    Adheres to HIPAA & ambient privacy guidelines.
    """
    text = PHONE_REGEX.sub("[PHONE_REDACTED]", text)
    text = SSN_REGEX.sub("[SSN_REDACTED]", text)
    text = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    return text
