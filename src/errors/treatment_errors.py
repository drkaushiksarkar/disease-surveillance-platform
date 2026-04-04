"""Treatment error definitions."""


class TreatmentError(Exception):
    """Base error for treatment operations."""
    code = "TREATMENT_ERROR"


class TreatmentNotFoundError(TreatmentError):
    code = "TREATMENT_NOT_FOUND"


class TreatmentValidationError(TreatmentError):
    code = "TREATMENT_VALIDATION"


class TreatmentTimeoutError(TreatmentError):
    code = "TREATMENT_TIMEOUT"


ERROR_CODES = {
    TreatmentError.code: "General treatment error",
    TreatmentNotFoundError.code: "Treatment resource not found",
    TreatmentValidationError.code: "Treatment validation failed",
    TreatmentTimeoutError.code: "Treatment operation timed out",
}
