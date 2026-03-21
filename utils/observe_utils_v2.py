"""Utility: observe processing v2."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_observe_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    """Process a batch of observe items."""
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "observe_v2",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_observe(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process observe item: %s", e)
    return results


def _validate_observe(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_observe_metrics(data: List[Dict]) -> Dict[str, Any]:
    return {"total": len(data), "valid": sum(1 for d in data if d.get("valid", True)), "version": "2"}
