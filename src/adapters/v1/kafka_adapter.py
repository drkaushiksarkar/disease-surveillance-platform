"""Kafka producer and consumer."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class KafkaAdapterConfig:
    """Configuration for kafka adapter."""
    endpoint: str = ""
    timeout_seconds: float = 1045.0
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    enabled: bool = True


class KafkaAdapterError(Exception):
    """Raised on kafka adapter failures."""
    pass


class KafkaAdapter:
    """Adapter for kafka producer and consumer."""

    def __init__(self, config: Optional[KafkaAdapterConfig] = None):
        self._config = config or KafkaAdapterConfig()
        self._connected = False
        self._operation_count = 0

    def connect(self) -> None:
        """Establish connection to the backend."""
        if self._connected:
            return
        if not self._config.endpoint:
            raise KafkaAdapterError("Endpoint not configured")
        logger.info("Connecting to %s", self._config.endpoint)
        self._connected = True

    def disconnect(self) -> None:
        """Close the connection."""
        if self._connected:
            logger.info("Disconnecting from %s", self._config.endpoint)
            self._connected = False

    def execute(self, operation: str, **kwargs) -> Any:
        """Execute an operation with retry logic."""
        if not self._connected:
            self.connect()

        last_error = None
        for attempt in range(self._config.max_retries + 1):
            try:
                result = self._do_execute(operation, **kwargs)
                self._operation_count += 1
                return result
            except Exception as exc:
                last_error = exc
                if attempt < self._config.max_retries:
                    delay = self._config.retry_delay_seconds * (2 ** attempt)
                    logger.warning(
                        "Attempt %d/%d failed for %s: %s. Retrying in %.1fs",
                        attempt + 1, self._config.max_retries + 1,
                        operation, exc, delay,
                    )
                    time.sleep(delay)

        raise KafkaAdapterError(
            f"Operation {operation} failed after {self._config.max_retries + 1} attempts: {last_error}"
        )

    def _do_execute(self, operation: str, **kwargs) -> Any:
        """Perform the actual operation. Override in subclasses."""
        return {"operation": operation, "status": "ok", "params": kwargs}

    def health_check(self) -> dict[str, Any]:
        """Check adapter health."""
        return {
            "adapter": self.__class__.__name__,
            "connected": self._connected,
            "endpoint": self._config.endpoint,
            "operations": self._operation_count,
        }

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False
