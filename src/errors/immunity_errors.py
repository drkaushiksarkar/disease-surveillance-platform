"""Immunity error definitions."""


class ImmunityError(Exception):
    """Base error for immunity operations."""
    code = "IMMUNITY_ERROR"


class ImmunityNotFoundError(ImmunityError):
    code = "IMMUNITY_NOT_FOUND"


class ImmunityValidationError(ImmunityError):
    code = "IMMUNITY_VALIDATION"


class ImmunityTimeoutError(ImmunityError):
    code = "IMMUNITY_TIMEOUT"


ERROR_CODES = {
    ImmunityError.code: "General immunity error",
    ImmunityNotFoundError.code: "Immunity resource not found",
    ImmunityValidationError.code: "Immunity validation failed",
    ImmunityTimeoutError.code: "Immunity operation timed out",
}
