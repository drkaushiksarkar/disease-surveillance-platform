"""Add location hierarchy."""

from __future__ import annotations


MIGRATION_ID = "003"
MIGRATION_NAME = "003_add_locations"
DESCRIPTION = "Add location hierarchy"
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
        CREATE TABLE IF NOT EXISTS add_locations (
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
        CREATE INDEX IF NOT EXISTS idx_add_locations_status
        ON add_locations (status)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_add_locations_created
        ON add_locations (created_at)
        """,
    ]


def get_downgrade_sql() -> list[str]:
    """Return SQL statements for downgrade."""
    return [
        "DROP TABLE IF EXISTS add_locations CASCADE",
    ]


def validate() -> bool:
    """Validate migration can be applied."""
    return True
