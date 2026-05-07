# AI Mentor Test Suite

This test suite is designed to identify where your AI mentor fails and help improve its quality.

## Test Categories

### 1. AI Failure Detection Tests (`aiFailureDetection.test.ts`)
Tests that identify specific AI failures:
- **Solution Leakage**: Detects when AI gives away complete solutions
- **Stage Violations**: Catches AI ignoring learning stage constraints
- **Response Quality**: Identifies unhelpful or low-quality responses
- **Context Failures**: Detects when AI ignores user code, errors, or history

### 2. Intent Classification Failure Tests (`intentClassificationFailure.test.ts`)
Tests that identify intent understanding failures:
- **Misclassification**: When AI misunderstands user requests
- **Subtle Cue Detection**: Missing nuanced user intent
- **Context Awareness**: Not considering conversation history or stage
- **Edge Cases**: Handling unusual inputs

### 3. Context Building Failure Tests (`contextBuildingFailure.test.ts`)
Tests that identify context building failures:
- **Missing Problem Context**: Not using problem information effectively
- **Ignoring User Code**: Not analyzing student's current implementation
- **Poor History Usage**: Not leveraging conversation history
- **Stage-Aware Context**: Not adapting context to learning stage

### 4. Integration Scenario Tests (`integrationScenarios.test.ts`)
Real-world scenario tests:
- **Complete Learning Journeys**: Full student progression
- **Frustration Handling**: How AI responds to stuck students
- **Edge Cases**: Unusual inputs and edge cases
- **Solution Blocking**: Ensuring AI doesn't give away answers

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test aiFailureDetection.test.ts
```

### Run with verbose output
```bash
npm run test:verbose
```

## Understanding Test Results

### Failure Categories

When tests fail, they'll indicate the type of failure:

1. **Solution Leakage** 🚨
   - AI is giving away complete solutions
   - **Severity**: HIGH
   - **Action**: Review response validation logic

2. **Stage Violation** ⚠️
   - AI is not respecting learning stage constraints
   - **Severity**: MEDIUM
   - **Action**: Check stage enforcement logic

3. **Low Quality** 📉
   - AI responses are unhelpful or too brief
   - **Severity**: MEDIUM
   - **Action**: Improve prompt engineering

4. **Context Failure** 🔍
   - AI is not using available information
   - **Severity**: LOW-MEDIUM
   - **Action**: Enhance context building

### Coverage Reports

After running `npm run test:coverage`, check:
- `coverage/index.html` - Visual coverage report
- `coverage/lcov.info` - Machine-readable coverage data

Target coverage areas:
- **Response Validation**: > 90%
- **Intent Classification**: > 85%
- **Context Building**: > 80%
- **Integration Scenarios**: > 75%

## Common Issues and Solutions

### Issue: Tests timeout
**Solution**: Increase timeout in jest.config.json:
```json
{
  "testTimeout": 60000
}
```

### Issue: Database connection errors
**Solution**: Ensure test database is running or update jest.setup.js mocks

### Issue: API key errors
**Solution**: Mock API calls in test setup or use test API keys

### Issue: Import resolution errors
**Solution**: Check moduleNameMapper in jest.config.json

## Adding New Tests

### Template for new test file

```typescript
/**
 * Description of what this test suite covers
 */

describe("Feature Name", () => {
  describe("Specific aspect", () => {
    it("should do something expected", () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedOutput);
    });
  });
});
```

### Best Practices

1. **Test real scenarios**: Use actual user queries and responses
2. **Test edge cases**: Include unusual inputs and boundary conditions
3. **Test failures**: Ensure tests catch actual problems
4. **Keep tests independent**: Each test should work in isolation
5. **Use descriptive names**: Test names should explain what they test

## Continuous Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Next Steps

1. **Run initial tests**: `npm test`
2. **Review failures**: Identify where AI is failing
3. **Fix issues**: Address the detected problems
4. **Add tests**: Cover new failure patterns as you discover them
5. **Monitor**: Run tests regularly to catch regressions

## Support

For issues or questions about the test suite:
- Check test output for specific error messages
- Review test code to understand expectations
- Examine AI responses that fail tests
- Adjust test thresholds if needed (but be careful!)

Remember: The goal is to identify real AI failures, not just pass tests.