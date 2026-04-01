"""health utility functions v2."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_health_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "health_v2",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_health(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process %s item: %s", "health", e)
    return results


def _validate_health(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_health_stats(data: List[Dict]) -> Dict[str, Any]:
    return {
        "total": len(data),
        "valid": sum(1 for d in data if d.get("valid", True)),
        "version": "2",
    }
