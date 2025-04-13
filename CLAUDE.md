# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Preview: `npm run preview`
- Lint: `npm run lint` or fix with `npm run lint:fix`
- Format: `npm run format` or check with `npm run format:check`
- Typecheck: `npm run typecheck`

### Testing Commands
- Run all tests: `npm run test` (runs both unit and integration tests)
- Unit tests only: `npm run test:unit`
- Component tests only: `npm run test:components`
- Single test file: `npm run test:unit src/path/to/file.test.ts`
- Single test case: `npm run test:unit -- -t "test name pattern"`
- Test with coverage: `npm run test:coverage`
- Check existing coverage report: `npm run check:coverage`
- Test with coverage and validate thresholds: `npm run test:coverage:check`
- Integration tests: `npm run test:integration` (requires app to be previewing)
- E2E tests with build: `npm run test:e2e` (builds app, starts preview server, runs integration tests)
- Test GitHub Actions remotely: `npm run test:workflows` (requires GITHUB_TOKEN)

### Validation Commands
- Complete CI validation: `npm run test:ci` (includes coverage check and integration tests)
- Validate code quality: `npm run validate` (typecheck, lint, format check, unit tests)
- Validate with coverage check: `npm run validate:coverage` (validate with coverage thresholds)
- Validate all: `npm run validate:all` (validate without coverage check + WebdriverIO typecheck + integration tests)
- Validate all with coverage: `npm run validate:all:coverage` (validate with coverage + WebdriverIO typecheck + integration tests)
- Deploy to dev: `npm run deploy:dev` (requires GITHUB_TOKEN)

## Code Style

- **Imports**: Group by type (external, internal, utils), alphabetize
- **Types**: Explicit return types on public functions, avoid `any`
- **Formatting**: Prettier enforced, 2 space indent, 100 chars width, semi, singleQuote
- **Naming**: camelCase for variables/methods, PascalCase for classes/components
- **Error handling**: Promise rejections must be caught, errors should be typed
- **Component structure**: Place services in `/services`, utilities in `/utils`
- **Testing**: All components must have browser-based tests with high coverage
  - Unit tests: Component and utility testing with Vitest (run in pre-commit hook)
  - Integration tests: Full browser tests with WebdriverIO that verify the built application (run in pre-push hook)
  - Current coverage requirements: 
    - Project thresholds are set to:
      - Statements: 70%
      - Branches: 50%
      - Functions: 85%
      - Lines: 70%
    - These thresholds are defined in both vitest.config.js and scripts/check-coverage.js
    - The `check-coverage.js` script is used to validate coverage thresholds
    - Integration tests require a running preview server (automatically handled by `test:e2e` script)
    - Validation will fail if coverage thresholds are not met
    - All files must meet coverage requirements before committing

## Project Overview

This codebase is a TypeScript Progressive Web Application (PWA) with:
- Multi-environment GitHub Pages deployment (dev, staging, production) via GitHub Actions
- In-browser testing with Vitest for unit tests and WebdriverIO for integration tests
- Local GitHub Actions validation with Act to prevent CI/CD failures
- PWA features including offline capabilities, background sync, and installability
- Math library integration with @uor-foundation/math-js for coordinate calculations

## Development Environment

This project is configured for development with VS Code DevContainers and GitHub Codespaces:

- DevContainer: The `.devcontainer` folder contains configuration for a local container development environment
- Codespaces: GitHub Codespaces is supported with custom configuration in `.devcontainer/codespaces.json` and setup scripts

When working in a container environment, all necessary dependencies are pre-installed and the development server starts automatically. The container includes:

- Node.js LTS
- Chrome for headless browser testing
- Git and GitHub CLI configuration
- Preset VS Code extensions and settings
- Automated port forwarding
- Claude Code CLI and VS Code extension

## Claude Code Integration

This project has built-in support for Claude Code in both DevContainers and Codespaces:

- The VS Code extension `anthropic.claude-code-vscode` is pre-configured
- The Claude Code CLI (`@anthropic-ai/claude-code`) is pre-installed
- Authentication supported via:
  - Interactive login wizard (run `claude` for first-time setup)
  - Environment variable support for `ANTHROPIC_API_KEY`

As Claude Code, you can:
1. Access the full context of the codebase through VS Code's workspace
2. Use the context to provide more accurate responses
3. Leverage VS Code features when answering questions
4. Make changes to the codebase through your tools directly

Your Claude Code settings have been configured to:
- Use the `claude-3-7-sonnet-20240229` model 
- Enable contextual tool calling
- Disable telemetry
- Keep autoRun set to false for safety

## Testing Notes

### Unit Tests (Vitest)
- Located in files with `.test.ts` extension
- Run in a JSDOM environment with custom element support
- Use `src/test-setup.js` to configure the test environment
- Coverage reports include JSON, HTML, LCOV formats
- Current thresholds: 70% statements, 50% branches, 85% functions, 70% lines

### Integration Tests (WebdriverIO)
- Located in `tests/integration/` directory
- Run with a real Chrome browser in headless mode
- Validate the built application in a preview server
- The integration test suite can only run with a preview server running
- `test:e2e` script automates building, starting a server, and running tests

### Testing Dependencies
- Tests use headless Chrome for browser testing
- Integration tests require port 4173 by default or find an available port
- Coverage reports are generated in the `coverage/` directory
- Unit tests run significantly faster than integration tests
