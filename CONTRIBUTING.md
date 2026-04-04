# Contributing

Thank you for considering contributing to this project. Every contribution helps improve health outcomes globally.

## Development Setup

1. Clone the repository
2. Create a virtual environment: `python -m venv .venv && source .venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt -r requirements-test.txt`
4. Run tests: `pytest tests/ -v`

## Code Standards

- Python 3.10+ with type annotations on all public functions
- Format with `ruff format`, lint with `ruff check`
- Type check with `mypy --strict`
- 90%+ test coverage for new code

## Pull Request Process

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `pytest tests/ -v --tb=short`
4. Update documentation if needed
5. Submit PR with clear description

## Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `test:` adding or updating tests
- `docs:` documentation changes
- `refactor:` code restructuring
- `ci:` CI/CD changes

## Architecture

See `docs/` for architecture documentation. Key patterns:
- Domain-driven design with clear module boundaries
- Protocol-based interfaces for extensibility
- Comprehensive error handling with structured logging
- All external calls go through retry/circuit breaker layer

## Reporting Issues

Use GitHub Issues with the appropriate template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version)
