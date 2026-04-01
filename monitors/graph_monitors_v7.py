"""Graph monitors module v7."""
from typing import Any, Dict, List


class GraphMonitors:
    """Handle graph monitors operations."""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.version = 7

    def process(self, data: List[Dict]) -> List[Dict]:
        return [self._transform(d) for d in data if self._validate(d)]

    def _transform(self, item: Dict) -> Dict:
        return {**item, "handler": "monitors", "source": "graph", "v": self.version}

    def _validate(self, item: Dict) -> bool:
        return bool(item.get("id"))
