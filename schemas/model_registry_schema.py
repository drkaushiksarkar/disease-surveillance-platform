"""Validation schemas for model_registry data."""
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class ModelRegistryStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ModelRegistryRecord:
    id: str
    name: str
    status: ModelRegistryStatus = ModelRegistryStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    tags: List[str] = field(default_factory=list)

    def validate(self) -> List[str]:
        errors = []
        if not self.id:
            errors.append("id is required")
        if not self.name:
            errors.append("name is required")
        if len(self.name) > 255:
            errors.append("name exceeds 255 characters")
        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status.value,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "tags": self.tags,
        }


def validate_batch(records: List[ModelRegistryRecord]) -> Dict[str, List[str]]:
    results = {}
    for record in records:
        errors = record.validate()
        if errors:
            results[record.id] = errors
    return results
