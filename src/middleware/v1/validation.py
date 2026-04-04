"""Request body validation."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class ValidationConfig:
    """Configuration for validation middleware."""
    enabled: bool = True
    log_level: str = "INFO"
    max_request_size: int = 10485760
    timeout_ms: int = 219000


class ValidationMiddleware:
    """Middleware for request body validation."""

    def __init__(self, config: Optional[ValidationConfig] = None):
        self._config = config or ValidationConfig()
        self._request_count = 0
        self._error_count = 0

    def process_request(self, request: dict[str, Any]) -> dict[str, Any]:
        """Process incoming request through middleware chain."""
        if not self._config.enabled:
            return request

        self._request_count += 1
        request_id = request.get("request_id", str(uuid.uuid4()))
        request["request_id"] = request_id
        request["_middleware_validation"] = True
        request["_timestamp"] = time.time()

        try:
            self._validate_request(request)
            self._enrich_request(request)
            return request
        except Exception as exc:
            self._error_count += 1
            logger.error("Middleware error [%s]: %s", request_id, exc)
            raise

    def process_response(self, response: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
        """Process outgoing response through middleware chain."""
        if not self._config.enabled:
            return response

        start_time = request.get("_timestamp", time.time())
        duration_ms = (time.time() - start_time) * 1000
        response["_duration_ms"] = round(duration_ms, 2)
        response["request_id"] = request.get("request_id")
        return response

    def _validate_request(self, request: dict[str, Any]) -> None:
        """Validate request against middleware rules."""
        body = request.get("body", "")
        if isinstance(body, (str, bytes)) and len(body) > self._config.max_request_size:
            raise ValueError(
                f"Request body exceeds maximum size: "
                f"{len(body)} > {self._config.max_request_size}"
            )

    def _enrich_request(self, request: dict[str, Any]) -> None:
        """Add metadata to the request."""
        request.setdefault("headers", {})
        request["headers"]["X-Request-ID"] = request["request_id"]
        request["headers"]["X-Middleware"] = "validation"

    @property
    def stats(self) -> dict[str, int]:
        return {
            "requests": self._request_count,
            "errors": self._error_count,
        }

    def reset_stats(self) -> None:
        self._request_count = 0
        self._error_count = 0
