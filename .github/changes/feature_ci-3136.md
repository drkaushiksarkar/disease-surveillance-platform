# ci: add pre-commit hooks and update CI pipeline

## Summary
- Add pre-commit config with ruff, black, mypy, detect-secrets
- Update CI to run pre-commit in check mode
- Add type checking step to CI matrix

## Test plan
- [x] Pre-commit passes on all existing code
- [x] CI runs all checks on PR
- [x] Type errors caught before merge
