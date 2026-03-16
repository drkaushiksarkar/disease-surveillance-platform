"""Utility: harmonize processing v5."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_harmonize_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    """Process a batch of harmonize items."""
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "harmonize_v5",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_harmonize(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process harmonize item: %s", e)
    return results


def _validate_harmonize(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_harmonize_metrics(data: List[Dict]) -> Dict[str, Any]:
    return {"total": len(data), "valid": sum(1 for d in data if d.get("valid", True)), "version": "5"}
