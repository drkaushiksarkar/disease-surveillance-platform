"""Request validation framework with composable rules and detailed error reporting."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Callable, Optional, Sequence, Union


@dataclass
class ValidationError:
    field: str
    message: str
    code: str
    value: Any = None

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "message": self.message,
            "code": self.code,
        }


@dataclass
class ValidationResult:
    errors: list[ValidationError] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, field: str, message: str, code: str, value: Any = None):
        self.errors.append(ValidationError(field, message, code, value))

    def merge(self, other: "ValidationResult") -> "ValidationResult":
        combined = ValidationResult()
        combined.errors = self.errors + other.errors
        return combined

    def to_dict(self) -> dict:
        return {
            "valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "error_count": len(self.errors),
        }


class Rule:
    """Base validation rule."""

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        raise NotImplementedError


class Required(Rule):
    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is None or (isinstance(value, str) and not value.strip()):
            return ValidationError(field_name, f"{field_name} is required", "required")
        return None


class MinLength(Rule):
    def __init__(self, length: int):
        self.length = length

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and len(str(value)) < self.length:
            return ValidationError(
                field_name,
                f"{field_name} must be at least {self.length} characters",
                "min_length",
                value,
            )
        return None


class MaxLength(Rule):
    def __init__(self, length: int):
        self.length = length

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and len(str(value)) > self.length:
            return ValidationError(
                field_name,
                f"{field_name} must not exceed {self.length} characters",
                "max_length",
                value,
            )
        return None


class Pattern(Rule):
    def __init__(self, pattern: str, message: Optional[str] = None):
        self.pattern = re.compile(pattern)
        self.message = message

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and not self.pattern.match(str(value)):
            msg = self.message or f"{field_name} does not match required pattern"
            return ValidationError(field_name, msg, "pattern", value)
        return None


class Range(Rule):
    def __init__(
        self,
        min_val: Optional[Union[int, float]] = None,
        max_val: Optional[Union[int, float]] = None,
    ):
        self.min_val = min_val
        self.max_val = max_val

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is None:
            return None
        try:
            num = float(value)
        except (TypeError, ValueError):
            return ValidationError(
                field_name, f"{field_name} must be a number", "type", value
            )
        if self.min_val is not None and num < self.min_val:
            return ValidationError(
                field_name,
                f"{field_name} must be >= {self.min_val}",
                "range_min",
                value,
            )
        if self.max_val is not None and num > self.max_val:
            return ValidationError(
                field_name,
                f"{field_name} must be <= {self.max_val}",
                "range_max",
                value,
            )
        return None


class OneOf(Rule):
    def __init__(self, choices: Sequence[Any]):
        self.choices = choices

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and value not in self.choices:
            return ValidationError(
                field_name,
                f"{field_name} must be one of: {', '.join(str(c) for c in self.choices)}",
                "one_of",
                value,
            )
        return None


class Email(Rule):
    EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and not self.EMAIL_RE.match(str(value)):
            return ValidationError(
                field_name, f"{field_name} is not a valid email", "email", value
            )
        return None


class DateFormat(Rule):
    def __init__(self, fmt: str = "%Y-%m-%d"):
        self.fmt = fmt

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is None:
            return None
        try:
            datetime.strptime(str(value), self.fmt)
        except ValueError:
            return ValidationError(
                field_name,
                f"{field_name} must be in format {self.fmt}",
                "date_format",
                value,
            )
        return None


class Custom(Rule):
    def __init__(self, func: Callable[[Any], bool], message: str, code: str = "custom"):
        self.func = func
        self.message = message
        self.code = code

    def validate(self, value: Any, field_name: str) -> Optional[ValidationError]:
        if value is not None and not self.func(value):
            return ValidationError(field_name, self.message, self.code, value)
        return None


class RequestValidator:
    """Composable request validator with field-level rules."""

    def __init__(self):
        self._field_rules: dict[str, list[Rule]] = {}

    def field(self, name: str, *rules: Rule) -> "RequestValidator":
        self._field_rules.setdefault(name, []).extend(rules)
        return self

    def validate(self, data: dict[str, Any]) -> ValidationResult:
        result = ValidationResult()
        for field_name, rules in self._field_rules.items():
            value = data.get(field_name)
            for rule in rules:
                error = rule.validate(value, field_name)
                if error:
                    result.errors.append(error)
                    if isinstance(rule, Required):
                        break
        return result


def validate_iso_country(code: str) -> bool:
    return isinstance(code, str) and len(code) == 3 and code.isalpha() and code.isupper()


def validate_indicator_code(code: str) -> bool:
    return isinstance(code, str) and re.match(r"^[A-Z]{2,6}\.[A-Z0-9._]+$", code) is not None


def validate_year_range(start: int, end: int) -> bool:
    return 1800 <= start <= 2100 and 1800 <= end <= 2100 and start <= end
