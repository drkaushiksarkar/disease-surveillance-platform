"""Utility: anomaly processing v7."""
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def process_anomaly_batch(items: List[Dict[str, Any]], config: Optional[Dict] = None) -> List[Dict]:
    """Process a batch of anomaly items."""
    config = config or {}
    results = []
    for item in items:
        try:
            transformed = {
                **item,
                "processed_by": "anomaly_v7",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if _validate_anomaly(transformed, config):
                results.append(transformed)
        except Exception as e:
            logger.warning("Failed to process anomaly item: %s", e)
    return results


def _validate_anomaly(item: Dict[str, Any], config: Dict) -> bool:
    required = config.get("required_fields", ["id"])
    return all(k in item for k in required)


def get_anomaly_metrics(data: List[Dict]) -> Dict[str, Any]:
    return {"total": len(data), "valid": sum(1 for d in data if d.get("valid", True)), "version": "7"}
