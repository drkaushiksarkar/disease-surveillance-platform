"""notify service layer v8."""
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class notifyRequest:
    query: Dict[str, Any] = field(default_factory=dict)
    limit: int = 800
    offset: int = 0


@dataclass
class notifyResponse:
    data: List[Dict[str, Any]] = field(default_factory=list)
    total: int = 0
    duration_ms: float = 0.0


class notifyService:
    def __init__(self, endpoint: str = "", timeout: int = 30):
        self.endpoint = endpoint
        self.timeout = timeout
        self._request_count = 0

    async def execute(self, request: notifyRequest) -> notifyResponse:
        self._request_count += 1
        start = datetime.utcnow()
        data = await self._fetch(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        return notifyResponse(data=data, total=len(data), duration_ms=elapsed)

    async def _fetch(self, request: notifyRequest) -> List[Dict[str, Any]]:
        return []

    @property
    def stats(self) -> Dict[str, Any]:
        return {"requests": self._request_count, "version": "8"}
