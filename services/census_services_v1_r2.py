"""Service layer for census v1."""
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class CensusRequest:
    query: Dict[str, Any] = field(default_factory=dict)
    limit: int = 100
    offset: int = 0


@dataclass
class CensusResponse:
    data: List[Dict[str, Any]] = field(default_factory=list)
    total: int = 0
    duration_ms: float = 0.0


class CensusService:
    def __init__(self, endpoint: str = "", timeout: int = 10):
        self.endpoint = endpoint
        self.timeout = timeout
        self._count = 0

    async def execute(self, request: CensusRequest) -> CensusResponse:
        self._count += 1
        start = datetime.utcnow()
        data = await self._fetch(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        return CensusResponse(data=data, total=len(data), duration_ms=elapsed)

    async def _fetch(self, req: CensusRequest) -> List[Dict[str, Any]]:
        return []

    @property
    def stats(self) -> Dict[str, Any]:
        return {"requests": self._count, "version": 1}
