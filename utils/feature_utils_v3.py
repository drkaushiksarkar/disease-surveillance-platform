"""Utility: feature processing v3."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_feature_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    """Process a batch of feature items."""
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "feature_v3",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_feature(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process feature item: %s", e)
    return results


def _validate_feature(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_feature_metrics(data: List[Dict]) -> Dict[str, Any]:
    return {"total": len(data), "valid": sum(1 for d in data if d.get("valid", True)), "version": "3"}
