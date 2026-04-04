"""Tests for request validation framework."""

import pytest

from src.validation.request_validator import (
    Custom,
    DateFormat,
    Email,
    MaxLength,
    MinLength,
    OneOf,
    Pattern,
    Range,
    RequestValidator,
    Required,
    ValidationResult,
    validate_indicator_code,
    validate_iso_country,
    validate_year_range,
)


class TestRequired:
    def test_none_fails(self):
        err = Required().validate(None, "name")
        assert err is not None
        assert err.code == "required"

    def test_empty_string_fails(self):
        err = Required().validate("  ", "name")
        assert err is not None

    def test_valid_value_passes(self):
        err = Required().validate("hello", "name")
        assert err is None

    def test_zero_passes(self):
        err = Required().validate(0, "count")
        assert err is None


class TestMinLength:
    def test_too_short_fails(self):
        err = MinLength(5).validate("ab", "field")
        assert err is not None
        assert err.code == "min_length"

    def test_exact_length_passes(self):
        err = MinLength(3).validate("abc", "field")
        assert err is None

    def test_none_passes(self):
        err = MinLength(3).validate(None, "field")
        assert err is None


class TestMaxLength:
    def test_too_long_fails(self):
        err = MaxLength(5).validate("abcdef", "field")
        assert err is not None
        assert err.code == "max_length"

    def test_exact_length_passes(self):
        err = MaxLength(3).validate("abc", "field")
        assert err is None


class TestPattern:
    def test_matching_passes(self):
        err = Pattern(r"^\d{3}-\d{4}$").validate("123-4567", "phone")
        assert err is None

    def test_non_matching_fails(self):
        err = Pattern(r"^\d{3}-\d{4}$").validate("abc", "phone")
        assert err is not None
        assert err.code == "pattern"

    def test_custom_message(self):
        err = Pattern(r"^\d+$", message="Numbers only").validate("abc", "id")
        assert err.message == "Numbers only"


class TestRange:
    def test_below_min_fails(self):
        err = Range(min_val=0).validate(-1, "score")
        assert err is not None
        assert err.code == "range_min"

    def test_above_max_fails(self):
        err = Range(max_val=100).validate(101, "score")
        assert err is not None
        assert err.code == "range_max"

    def test_within_range_passes(self):
        err = Range(min_val=0, max_val=100).validate(50, "score")
        assert err is None

    def test_non_numeric_fails(self):
        err = Range(min_val=0).validate("abc", "score")
        assert err is not None
        assert err.code == "type"


class TestOneOf:
    def test_valid_choice_passes(self):
        err = OneOf(["low", "medium", "high"]).validate("medium", "priority")
        assert err is None

    def test_invalid_choice_fails(self):
        err = OneOf(["low", "medium", "high"]).validate("extreme", "priority")
        assert err is not None
        assert err.code == "one_of"


class TestEmail:
    def test_valid_email_passes(self):
        err = Email().validate("user@example.com", "email")
        assert err is None

    def test_invalid_email_fails(self):
        err = Email().validate("not-an-email", "email")
        assert err is not None
        assert err.code == "email"


class TestDateFormat:
    def test_valid_date_passes(self):
        err = DateFormat().validate("2024-01-15", "date")
        assert err is None

    def test_invalid_date_fails(self):
        err = DateFormat().validate("15/01/2024", "date")
        assert err is not None
        assert err.code == "date_format"

    def test_custom_format(self):
        err = DateFormat("%d/%m/%Y").validate("15/01/2024", "date")
        assert err is None


class TestRequestValidator:
    def test_valid_request(self):
        validator = (
            RequestValidator()
            .field("name", Required(), MinLength(2), MaxLength(100))
            .field("email", Required(), Email())
            .field("age", Range(min_val=0, max_val=150))
        )
        result = validator.validate({
            "name": "Kaushik",
            "email": "test@example.com",
            "age": 35,
        })
        assert result.is_valid

    def test_multiple_errors(self):
        validator = (
            RequestValidator()
            .field("name", Required())
            .field("email", Required(), Email())
        )
        result = validator.validate({"name": None, "email": "bad"})
        assert not result.is_valid
        assert len(result.errors) >= 2

    def test_required_stops_further_checks(self):
        validator = (
            RequestValidator()
            .field("name", Required(), MinLength(10))
        )
        result = validator.validate({"name": None})
        name_errors = [e for e in result.errors if e.field == "name"]
        assert len(name_errors) == 1
        assert name_errors[0].code == "required"

    def test_to_dict_format(self):
        result = ValidationResult()
        result.add_error("field", "message", "code")
        d = result.to_dict()
        assert d["valid"] is False
        assert d["error_count"] == 1
        assert d["errors"][0]["field"] == "field"


class TestDomainValidators:
    def test_valid_iso_country(self):
        assert validate_iso_country("USA") is True
        assert validate_iso_country("IND") is True

    def test_invalid_iso_country(self):
        assert validate_iso_country("us") is False
        assert validate_iso_country("USAA") is False
        assert validate_iso_country("123") is False

    def test_valid_indicator_code(self):
        assert validate_indicator_code("SH.DYN.MORT") is True
        assert validate_indicator_code("NY.GDP.PCAP.CD") is True

    def test_invalid_indicator_code(self):
        assert validate_indicator_code("invalid") is False
        assert validate_indicator_code("") is False

    def test_valid_year_range(self):
        assert validate_year_range(2000, 2024) is True
        assert validate_year_range(1900, 1900) is True

    def test_invalid_year_range(self):
        assert validate_year_range(2024, 2000) is False
        assert validate_year_range(1700, 2000) is False
