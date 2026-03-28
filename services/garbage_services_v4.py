"""garbage service layer v4."""
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class garuageRequest:
    query: Dict[str, Any] = field(default_factory=dict)
    limit: int = 400
    offset: int = 0


@dataclass
class garuageResponse:
    data: List[Dict[str, Any]] = field(default_factory=list)
    total: int = 0
    duration_ms: float = 0.0


class garuageService:
    def __init__(self, endpoint: str = "", timeout: int = 30):
        self.endpoint = endpoint
        self.timeout = timeout
        self._request_count = 0

    async def execute(self, request: garuageRequest) -> garuageResponse:
        self._request_count += 1
        start = datetime.utcnow()
        data = await self._fetch(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        return garuageResponse(data=data, total=len(data), duration_ms=elapsed)

    async def _fetch(self, request: garuageRequest) -> List[Dict[str, Any]]:
        return []

    @property
    def stats(self) -> Dict[str, Any]:
        return {"requests": self._request_count, "version": "4"}
