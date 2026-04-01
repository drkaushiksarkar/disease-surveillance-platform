"""Aggregate validators module v3."""
from typing import Any, Dict, List


class AggregateValidators:
    """Handle aggregate validators operations."""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.version = 3

    def process(self, data: List[Dict]) -> List[Dict]:
        return [self._transform(d) for d in data if self._validate(d)]

    def _transform(self, item: Dict) -> Dict:
        return {**item, "handler": "validators", "source": "aggregate", "v": self.version}

    def _validate(self, item: Dict) -> bool:
        return bool(item.get("id"))
