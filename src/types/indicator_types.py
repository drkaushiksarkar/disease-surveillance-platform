"""Indicator type definitions."""
from typing import Any, Dict, List, Optional, TypedDict
from datetime import datetime


class IndicatorRecord(TypedDict):
    id: str
    name: str
    type: str
    metadata: Dict[str, Any]
    created_at: str
    updated_at: Optional[str]


class IndicatorQuery(TypedDict, total=False):
    limit: int
    offset: int
    filter: str
    sort_by: str
    order: str


class IndicatorResponse(TypedDict):
    data: List[IndicatorRecord]
    total: int
    page: int
    has_more: bool
