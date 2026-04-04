"""Data quality assessment result."""

from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


class QualityReportStatus(enum.Enum):
    """Status enumeration for quality_report."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


@dataclass
class QualityReport:
    """Data model for data quality assessment result."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    status: QualityReportStatus = QualityReportStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    version: int = 5

    def activate(self) -> None:
        """Transition to active status."""
        if self.status == QualityReportStatus.DELETED:
            raise ValueError("Cannot activate deleted record")
        self.status = QualityReportStatus.ACTIVE
        self.updated_at = datetime.utcnow()

    def archive(self) -> None:
        """Transition to archived status."""
        self.status = QualityReportStatus.ARCHIVED
        self.updated_at = datetime.utcnow()

    def soft_delete(self) -> None:
        """Mark as deleted without removal."""
        self.status = QualityReportStatus.DELETED
        self.updated_at = datetime.utcnow()

    def update_metadata(self, key: str, value: Any) -> None:
        """Update a single metadata field."""
        self.metadata[key] = value
        self.updated_at = datetime.utcnow()

    @property
    def is_active(self) -> bool:
        return self.status == QualityReportStatus.ACTIVE

    @property
    def age_seconds(self) -> float:
        return (datetime.utcnow() - self.created_at).total_seconds()

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by,
            "metadata": self.metadata,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "QualityReport":
        """Deserialize from dictionary."""
        instance = cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data.get("name", ""),
            description=data.get("description", ""),
            created_by=data.get("created_by"),
            version=data.get("version", 1),
        )
        if data.get("status"):
            instance.status = QualityReportStatus(data["status"])
        if data.get("metadata"):
            instance.metadata = data["metadata"]
        return instance

    def __repr__(self) -> str:
        return f"QualityReport(id={self.id[:8]}, name={self.name!r}, status={self.status.value})"
