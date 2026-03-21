"""Schema definitions for failover v4."""
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class FailoverStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DONE = "done"
    ERROR = "error"


@dataclass
class FailoverRecord:
    id: str
    name: str
    status: FailoverStatus = FailoverStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    version: int = 4

    def validate(self) -> List[str]:
        errors = []
        if not self.id:
            errors.append("id required")
        if not self.name or len(self.name) > 255:
            errors.append("name invalid")
        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {"id": self.id, "name": self.name, "status": self.status.value, "v": self.version}
