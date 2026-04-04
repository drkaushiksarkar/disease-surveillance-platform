"""Add alert and notification tables."""

from __future__ import annotations


MIGRATION_ID = "005"
MIGRATION_NAME = "005_add_alerts"
DESCRIPTION = "Add alert and notification tables"
REVERSIBLE = True


def upgrade(connection) -> None:
    """Apply migration forward."""
    statements = get_upgrade_sql()
    for stmt in statements:
        connection.execute(stmt)


def downgrade(connection) -> None:
    """Reverse migration."""
    if not REVERSIBLE:
        raise RuntimeError(f"Migration {MIGRATION_ID} is not reversible")
    statements = get_downgrade_sql()
    for stmt in statements:
        connection.execute(stmt)


def get_upgrade_sql() -> list[str]:
    """Return SQL statements for upgrade."""
    return [
        """
        CREATE TABLE IF NOT EXISTS add_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            data JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by VARCHAR(255),
            version INTEGER DEFAULT 1
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_add_alerts_status
        ON add_alerts (status)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_add_alerts_created
        ON add_alerts (created_at)
        """,
    ]


def get_downgrade_sql() -> list[str]:
    """Return SQL statements for downgrade."""
    return [
        "DROP TABLE IF EXISTS add_alerts CASCADE",
    ]


def validate() -> bool:
    """Validate migration can be applied."""
    return True
