# Tests

This directory contains browser-based integration tests for the application using WebdriverIO.

## Git Hooks

This project uses Git hooks to ensure code quality:

- **Pre-commit hook**: Runs linting, type checking, and unit tests to catch issues early
- **Pre-push hook**: Runs integration tests, validates GitHub Actions workflows using Act, and verifies the application works in a real browser

### GitHub Actions Integration

The pre-push hook ensures that all code quality checks and tests pass locally before pushing changes to GitHub. This process helps maintain high quality code:

1. **Local Validation**: Ensures code quality checks and tests pass before pushing
2. **Remote Verification**: GitHub Actions will then run on the remote server for further validation
3. **Continuous Integration**: Prevents broken builds and failed deployments

## Test Structure

- `integration/` - Browser integration tests
  - `app.test.ts` - Main application tests
  - `console.test.ts` - Console error/warning capture tests
  - `helpers.ts` - Shared test utilities

## Running Tests

Integration tests can be run using the following npm scripts:

```bash
# Run integration tests (requires app to be running)
npm run test:integration

# Run integration tests with file watching
npm run test:integration:watch

# Build the app, start a preview server, and run integration tests
npm run test:e2e

# Run complete CI validation suite (tests)
npm run test:ci

# Test GitHub Actions workflows remotely (requires GITHUB_TOKEN)
npm run test:workflows
```

## Test Features

1. **Browser Testing**: Uses real Chrome browser (headless) via WebdriverIO
2. **Console Error Capture**: Automatically detects and reports any JS console errors/warnings
3. **PWA Validation**: Verifies that PWA features are working correctly
4. **Component Interaction**: Tests real user interactions with components

## Adding New Tests

To add new integration tests:

1. Create a new test file in the `integration/` directory
2. Import helpers from `helpers.ts` as needed
3. Use WebdriverIO API to interact with the browser
4. Make sure to check for console errors in each test

Example:

```typescript
import { expect } from '@wdio/globals';
import { waitForPageLoad } from './helpers';

describe('My New Test', () => {
  beforeEach(async () => {
    await browser.url('/');
    await waitForPageLoad();
  });

  it('should test something', async () => {
    // Test implementation
    expect(await browser.getTitle()).toBeTruthy();
  });
});
```
