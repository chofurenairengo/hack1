# Testing Requirements

## Minimum Test Coverage: 80%

Test Types (ALL required):

1. **Unit Tests** - Individual functions, utilities, components
2. **Integration Tests** - API endpoints, database operations
3. **E2E Tests** - Critical user flows (framework chosen per language)

## Test-Driven Development

MANDATORY workflow:

1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Test Structure

Use the Arrange-Act-Assert pattern:

- **Arrange**: Set up test data and preconditions
- **Act**: Execute the code under test
- **Assert**: Verify the expected outcomes

Use descriptive test names that explain the behavior under test:

```
// GOOD: describes behavior
it('returns null when user is not found')
it('throws validation error when email is invalid')

// BAD: vague
it('works correctly')
it('test user')
```

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first
