"""Incidence error definitions."""


class IncidenceError(Exception):
    """Base error for incidence operations."""
    code = "INCIDENCE_ERROR"


class IncidenceNotFoundError(IncidenceError):
    code = "INCIDENCE_NOT_FOUND"


class IncidenceValidationError(IncidenceError):
    code = "INCIDENCE_VALIDATION"


class IncidenceTimeoutError(IncidenceError):
    code = "INCIDENCE_TIMEOUT"


ERROR_CODES = {
    IncidenceError.code: "General incidence error",
    IncidenceNotFoundError.code: "Incidence resource not found",
    IncidenceValidationError.code: "Incidence validation failed",
    IncidenceTimeoutError.code: "Incidence operation timed out",
}
