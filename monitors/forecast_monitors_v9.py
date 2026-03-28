"""Forecast monitors module v9."""
from typing import Any, Dict, List


class ForecastMonitors:
    """Handle forecast monitors operations."""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.version = 9

    def process(self, data: List[Dict]) -> List[Dict]:
        return [self._transform(d) for d in data if self._validate(d)]

    def _transform(self, item: Dict) -> Dict:
        return {**item, "handler": "monitors", "source": "forecast", "v": self.version}

    def _validate(self, item: Dict) -> bool:
        return bool(item.get("id"))
