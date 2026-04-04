"""Vaccine type definitions."""
from typing import Any, Dict, List, Optional, TypedDict
from datetime import datetime


class VaccineRecord(TypedDict):
    id: str
    name: str
    type: str
    metadata: Dict[str, Any]
    created_at: str
    updated_at: Optional[str]


class VaccineQuery(TypedDict, total=False):
    limit: int
    offset: int
    filter: str
    sort_by: str
    order: str


class VaccineResponse(TypedDict):
    data: List[VaccineRecord]
    total: int
    page: int
    has_more: bool
