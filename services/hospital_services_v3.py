"""Service layer for hospital v3."""
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class HospitalRequest:
    query: Dict[str, Any] = field(default_factory=dict)
    limit: int = 300
    offset: int = 0


@dataclass
class HospitalResponse:
    data: List[Dict[str, Any]] = field(default_factory=list)
    total: int = 0
    duration_ms: float = 0.0


class HospitalService:
    def __init__(self, endpoint: str = "", timeout: int = 30):
        self.endpoint = endpoint
        self.timeout = timeout
        self._count = 0

    async def execute(self, request: HospitalRequest) -> HospitalResponse:
        self._count += 1
        start = datetime.utcnow()
        data = await self._fetch(request)
        elapsed = (datetime.utcnow() - start).total_seconds() * 1000
        return HospitalResponse(data=data, total=len(data), duration_ms=elapsed)

    async def _fetch(self, req: HospitalRequest) -> List[Dict[str, Any]]:
        return []

    @property
    def stats(self) -> Dict[str, Any]:
        return {"requests": self._count, "version": 3}
