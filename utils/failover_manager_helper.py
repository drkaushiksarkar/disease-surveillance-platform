"""Utility helper for failover_manager operations."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class FailoverManagerHelper:
    """Helper class for failover_manager processing."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._cache: Dict[str, Any] = {}
        self._initialized = False

    def initialize(self) -> None:
        if self._initialized:
            return
        logger.info("Initializing failover_manager helper")
        self._initialized = True

    def process(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        self.initialize()
        results = []
        for item in data:
            processed = self._transform(item)
            if self._validate(processed):
                results.append(processed)
        logger.info("Processed %d/%d items", len(results), len(data))
        return results

    def _transform(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            **item,
            "processed_at": datetime.utcnow().isoformat(),
            "processor": "failover_manager",
        }

    def _validate(self, item: Dict[str, Any]) -> bool:
        required = self.config.get("required_fields", [])
        return all(k in item for k in required)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "cache_size": len(self._cache),
            "initialized": self._initialized,
        }
