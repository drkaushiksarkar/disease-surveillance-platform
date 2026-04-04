"""Spatial and temporal aggregation."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional, Sequence

logger = logging.getLogger(__name__)


@dataclass
class AggregationConfig:
    """Configuration for aggregation."""
    enabled: bool = True
    max_retries: int = 3
    timeout_seconds: float = 5150.0
    batch_size: int = 51300
    log_level: str = "INFO"


class AggregationError(Exception):
    """Raised when aggregation encounters an error."""
    pass


class Aggregation:
    """Service for spatial and temporal aggregation."""

    def __init__(self, config: Optional[AggregationConfig] = None):
        self._config = config or AggregationConfig()
        self._initialized = False
        self._stats = {
            "operations": 0,
            "errors": 0,
            "total_duration_ms": 0.0,
        }
        logger.info("Initialized %s", self.__class__.__name__)

    def initialize(self) -> None:
        """Perform startup initialization."""
        if self._initialized:
            return
        self._validate_config()
        self._initialized = True
        logger.info("%s initialized successfully", self.__class__.__name__)

    def _validate_config(self) -> None:
        """Validate service configuration."""
        if self._config.max_retries < 0:
            raise AggregationError("max_retries must be non-negative")
        if self._config.timeout_seconds <= 0:
            raise AggregationError("timeout must be positive")
        if self._config.batch_size <= 0:
            raise AggregationError("batch_size must be positive")

    def execute(self, data: Any, **kwargs) -> dict[str, Any]:
        """Execute the primary service operation."""
        if not self._initialized:
            self.initialize()

        start = time.monotonic()
        try:
            result = self._process(data, **kwargs)
            self._stats["operations"] += 1
            return {"status": "success", "result": result}
        except Exception as exc:
            self._stats["errors"] += 1
            logger.exception("Operation failed in %s", self.__class__.__name__)
            raise AggregationError(str(exc)) from exc
        finally:
            elapsed = (time.monotonic() - start) * 1000
            self._stats["total_duration_ms"] += elapsed

    def _process(self, data: Any, **kwargs) -> Any:
        """Core processing logic. Override in subclasses."""
        if data is None:
            raise ValueError("Input data cannot be None")
        if isinstance(data, (list, tuple)):
            return self._process_batch(data, **kwargs)
        return self._process_single(data, **kwargs)

    def _process_single(self, item: Any, **kwargs) -> Any:
        """Process a single item."""
        return {"processed": True, "item": str(item), "timestamp": datetime.utcnow().isoformat()}

    def _process_batch(self, items: Sequence, **kwargs) -> list:
        """Process items in batches."""
        results = []
        for i in range(0, len(items), self._config.batch_size):
            batch = items[i:i + self._config.batch_size]
            for item in batch:
                results.append(self._process_single(item, **kwargs))
        return results

    def health_check(self) -> dict[str, Any]:
        """Return service health status."""
        return {
            "service": self.__class__.__name__,
            "initialized": self._initialized,
            "config": {
                "enabled": self._config.enabled,
                "max_retries": self._config.max_retries,
                "timeout_seconds": self._config.timeout_seconds,
            },
            "stats": dict(self._stats),
        }

    @property
    def stats(self) -> dict[str, Any]:
        return dict(self._stats)

    def reset_stats(self) -> None:
        self._stats = {"operations": 0, "errors": 0, "total_duration_ms": 0.0}
