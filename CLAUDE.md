# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Preview: `npm run preview`
- Lint: `npm run lint` or fix with `npm run lint:fix`
- Format: `npm run format` or check with `npm run format:check`
- Typecheck: `npm run typecheck`
- Test: `npm run test`
- Single test: `npm run test src/path/to/file.test.ts`
- Single test case: `npm run test -- -t "test name pattern"`
- Test with coverage: `npm run test:coverage`
- Integration tests: `npm run test:integration`
- E2E tests with build: `npm run test:e2e`
- Test GitHub Actions remotely: `npm run test:workflows` (requires GITHUB_TOKEN)
- Complete CI validation: `npm run test:ci`
- Validate all: `npm run validate:all`
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

The codebase is a TypeScript PWA with multi-environment GitHub Pages deployment (dev, staging, production) via GitHub Actions, enforces in-browser testing, and includes local GitHub Actions validation with Act to prevent CI/CD failures.

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
