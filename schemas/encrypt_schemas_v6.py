"""Schema definitions for encrypt v6."""
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class EncryptStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DONE = "done"
    ERROR = "error"


@dataclass
class EncryptRecord:
    id: str
    name: str
    status: EncryptStatus = EncryptStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    version: int = 6

    def validate(self) -> List[str]:
        errors = []
        if not self.id:
            errors.append("id required")
        if not self.name or len(self.name) > 255:
            errors.append("name invalid")
        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {"id": self.id, "name": self.name, "status": self.status.value, "v": self.version}
