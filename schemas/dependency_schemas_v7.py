"""dependency data schemas v7."""
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class dependencyStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DONE = "done"
    ERROR = "error"


@dataclass
class dependencyRecord:
    id: str
    name: str
    status: dependencyStatus = dependencyStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    version: int = 7

    def validate(self) -> List[str]:
        errors = []
        if not self.id:
            errors.append("id required")
        if not self.name or len(self.name) > 255:
            errors.append("name invalid")
        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {"id": self.id, "name": self.name, "status": self.status.value, "version": self.version}
