"""Configuration validation schema."""

from __future__ import annotations

from typing import Any, Optional


SCHEMA_CONFIG_SCHEMA = {
    "type": "object",
    "title": "Config Schema Schema",
    "description": "Configuration validation schema",
    "version": "3.5.0",
    "properties": {
        "id": {
            "type": "string",
            "format": "uuid",
            "description": "Unique identifier",
        },
        "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 255,
            "description": "Human-readable name",
        },
        "type": {
            "type": "string",
            "enum": ["standard", "computed", "derived", "external"],
            "description": "Record type classification",
        },
        "status": {
            "type": "string",
            "enum": ["draft", "active", "archived"],
            "default": "draft",
        },
        "value": {
            "type": "number",
            "description": "Primary numeric value",
        },
        "metadata": {
            "type": "object",
            "additionalProperties": True,
            "description": "Extensible metadata",
        },
        "tags": {
            "type": "array",
            "items": {"type": "string"},
            "uniqueItems": True,
        },
        "created_at": {
            "type": "string",
            "format": "date-time",
        },
        "updated_at": {
            "type": "string",
            "format": "date-time",
        },
    },
    "required": ["id", "name", "type"],
    "additionalProperties": False,
}


def validate_config_schema(data: dict[str, Any]) -> list[str]:
    """Validate data against config_schema schema. Returns list of error messages."""
    errors = []
    schema = SCHEMA_CONFIG_SCHEMA
    required = schema.get("required", [])
    properties = schema.get("properties", {})

    for req_field in required:
        if req_field not in data:
            errors.append(f"Missing required field: {req_field}")

    for field_name, value in data.items():
        if field_name not in properties:
            if not schema.get("additionalProperties", True):
                errors.append(f"Unknown field: {field_name}")
            continue

        prop = properties[field_name]
        expected_type = prop.get("type")

        if expected_type == "string" and not isinstance(value, str):
            errors.append(f"{field_name}: expected string, got {type(value).__name__}")
        elif expected_type == "number" and not isinstance(value, (int, float)):
            errors.append(f"{field_name}: expected number, got {type(value).__name__}")
        elif expected_type == "array" and not isinstance(value, list):
            errors.append(f"{field_name}: expected array, got {type(value).__name__}")
        elif expected_type == "object" and not isinstance(value, dict):
            errors.append(f"{field_name}: expected object, got {type(value).__name__}")

        if expected_type == "string":
            min_len = prop.get("minLength")
            max_len = prop.get("maxLength")
            if min_len and isinstance(value, str) and len(value) < min_len:
                errors.append(f"{field_name}: length below minimum {min_len}")
            if max_len and isinstance(value, str) and len(value) > max_len:
                errors.append(f"{field_name}: length above maximum {max_len}")

            enum_vals = prop.get("enum")
            if enum_vals and value not in enum_vals:
                errors.append(f"{field_name}: must be one of {enum_vals}")

    return errors


def get_schema() -> dict[str, Any]:
    """Return the full schema definition."""
    return dict(SCHEMA_CONFIG_SCHEMA)


def get_required_fields() -> list[str]:
    """Return list of required field names."""
    return list(SCHEMA_CONFIG_SCHEMA.get("required", []))


def get_field_names() -> list[str]:
    """Return all field names defined in schema."""
    return list(SCHEMA_CONFIG_SCHEMA.get("properties", {}).keys())
