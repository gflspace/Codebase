# Contributing to CIS Laravel Integration

Thank you for your interest in contributing to the QwickServices CIS Laravel Integration package!

## Development Setup

### Prerequisites

- PHP 8.1+
- Composer
- Laravel 10+
- CIS backend instance for testing
- Redis (for queue testing)

### Clone and Install

```bash
git clone https://github.com/qwickservices/cis-laravel.git
cd cis-laravel
composer install
```

### Configure Test Environment

Copy `.env.example` to `.env.testing`:

```bash
cp .env.example .env.testing
```

Update with your test CIS backend URL and secret.

## Code Standards

### PSR-12 Coding Standard

All code must follow PSR-12:

```bash
composer run phpcs
```

Auto-fix issues:

```bash
composer run phpcbf
```

### PHP 8.1+ Features

Use modern PHP syntax:
- Typed properties
- Named arguments
- Readonly properties where appropriate
- Match expressions over switch
- Constructor property promotion

### Type Safety

- Use `declare(strict_types=1);` in all files
- Type hint all parameters and return types
- Use PHPDoc for complex types and generics

### Example

```php
<?php

declare(strict_types=1);

namespace QwickServices\CIS;

/**
 * Short description.
 *
 * Longer description if needed.
 */
class ExampleClass
{
    /**
     * @param array<string, mixed> $options
     */
    public function __construct(
        private readonly string $baseUrl,
        private array $options = [],
    ) {
    }

    /**
     * Method description.
     *
     * @param string $input Input description
     * @return array<string, mixed> Return value description
     */
    public function exampleMethod(string $input): array
    {
        // Implementation
    }
}
```

## Testing

### Running Tests

```bash
composer test
```

### Test Coverage

Aim for >80% code coverage:

```bash
composer test-coverage
```

### Writing Tests

- Write tests for all new features
- Update tests when modifying existing features
- Use descriptive test names: `test_booking_evaluation_blocks_high_risk_users`
- Mock external dependencies (CIS backend)
- Test both success and failure paths

Example:

```php
public function test_evaluate_returns_blocked_for_high_risk(): void
{
    $client = new CISClient($this->baseUrl, $this->secret);

    // Mock HTTP client response
    $this->mockHttpResponse(403, [
        'decision' => 'block',
        'risk_score' => 95,
    ]);

    $evaluation = $client->evaluate('booking.create', 'user-123', 'provider-456');

    $this->assertTrue($evaluation->isBlocked());
    $this->assertEquals(95, $evaluation->riskScore);
}
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass
2. Run code style checks
3. Update documentation if needed
4. Add changelog entry in `CHANGELOG.md` under `[Unreleased]`
5. Ensure your commits follow conventional commits format

### Commit Message Format

Use conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:

```
feat(client): add circuit breaker pattern

Implements circuit breaker for improved resilience when CIS backend
is experiencing intermittent failures.

Closes #123
```

```
fix(middleware): handle null user_id gracefully

Previously threw exception when user_id was null. Now logs warning
and allows request to proceed.

Fixes #456
```

### PR Description Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
Describe how you tested your changes.

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] No breaking changes (or clearly documented)
```

## Areas for Contribution

### High Priority

- Additional middleware for other action types (messages, provider registration)
- Improved error handling and logging
- Performance optimizations
- More comprehensive test coverage

### Medium Priority

- Circuit breaker pattern implementation
- Batch evaluation support
- Metrics collection and monitoring
- Laravel Nova integration

### Documentation

- Additional usage examples
- Video tutorials
- Integration guides for popular packages
- Troubleshooting guides

## Code Review Process

1. PRs require at least one approval
2. All CI checks must pass
3. Code must maintain >80% coverage
4. Documentation must be updated
5. Changelog must be updated

## Questions?

- Open an issue for bugs or feature requests
- Email dev@qwickservices.com for questions
- Join our Discord community (link TBD)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
