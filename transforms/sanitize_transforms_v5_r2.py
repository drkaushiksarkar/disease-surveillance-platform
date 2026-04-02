"""Sanitize transforms module v5."""
from typing import Any, Dict, List


class SanitizeTransforms:
    """Handle sanitize transforms operations."""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.version = 5

    def process(self, data: List[Dict]) -> List[Dict]:
        return [self._transform(d) for d in data if self._validate(d)]

    def _transform(self, item: Dict) -> Dict:
        return {**item, "handler": "transforms", "source": "sanitize", "v": self.version}

    def _validate(self, item: Dict) -> bool:
        return bool(item.get("id"))
