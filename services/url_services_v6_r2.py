"""Service layer for url v6."""
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class UrlRequest:
    query: Dict[str, Any] = field(default_factory=dict)
    limit: int = 600
    offset: int = 0


@dataclass
class UrlResponse:
    data: List[Dict[str, Any]] = field(default_factory=list)
    total: int = 0
    duration_ms: float = 0.0


class UrlService:
    def __init__(self, endpoint: str = "", timeout: int = 60):
        self.endpoint = endpoint
        self.timeout = timeout
        self._count = 0

    async def execute(self, request: UrlRequest) -> UrlResponse:
        self._count += 1
        start = datetime.utcnow()
        data = await self._fetch(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        return UrlResponse(data=data, total=len(data), duration_ms=elapsed)

    async def _fetch(self, req: UrlRequest) -> List[Dict[str, Any]]:
        return []

    @property
    def stats(self) -> Dict[str, Any]:
        return {"requests": self._count, "version": 6}
