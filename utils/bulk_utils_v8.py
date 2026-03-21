"""bulk utility functions v8."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_bulk_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "bulk_v8",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_bulk(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process %s item: %s", "bulk", e)
    return results


def _validate_bulk(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_bulk_stats(data: List[Dict]) -> Dict[str, Any]:
    return {
        "total": len(data),
        "valid": sum(1 for d in data if d.get("valid", True)),
        "version": "8",
    }
