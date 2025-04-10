# TypeScript PWA Template with GitHub Pages Deployment

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open%20in-GitHub%20Codespaces-blue?logo=github)](https://github.com/codespaces/new?hide_repo_select=true&ref=main)

A fully-featured TypeScript PWA template that deploys to GitHub Pages using GitHub Actions. This template includes in-browser testing, PWA capabilities, TypeScript support, and is configured for development with DevContainers and GitHub Codespaces.

## Features

- 🚀 TypeScript support
- 📱 PWA ready with workbox
- 🧪 In-browser testing with Vitest
- 🔄 Automatic GitHub Pages deployment
- 🎨 Basic styling and counter example
- 🐳 DevContainer and GitHub Codespaces ready
- 🤖 Claude Code integration for AI-assisted development
- 🔧 Automated issue implementation by Claude AI
- 🧪 Local GitHub Actions testing with Act

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Test GitHub Actions workflows locally
npm run test:actions

# Run complete CI validation (tests + GitHub Actions)
npm run test:ci

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment

This template uses a multi-environment deployment approach with GitHub Pages:

- **Dev Environment**: For local testing and development
- **Staging Environment**: Automatically deployed for Pull Requests
- **Production Environment**: Deployed from the main branch

### Environment Setup

1. Go to your repository settings
2. Navigate to the Pages section
3. Set the source to "GitHub Actions"
4. Go to Settings > Environments and create three environments:
   - `dev`
   - `staging`
   - `production`

### Deployment Methods

#### Dev Environment

There are two ways to deploy to the dev environment:

1. **With Git Push**: 
   - When pushing changes, the pre-push hook will ask if you want to deploy to dev
   - Requires a GitHub token exported as `GITHUB_TOKEN` in your environment

2. **Manual Deployment**:
   ```bash
   # Export your GitHub token first
   export GITHUB_TOKEN=your_github_token
   
   # Run the deployment script
   npm run deploy:dev
   ```

#### Staging Environment

Automatically deployed when a Pull Request is created or updated. A comment with a preview link will be added to the PR.

#### Production Environment

Automatically deployed when changes are pushed to the `main` branch.

## Testing

### In-Browser Testing

All component tests run in a browser environment to ensure accurate DOM testing. The tests are located in `src/*.test.ts` files and use Vitest with browser support.

### GitHub Actions Workflows

GitHub Actions workflows are automatically run on the remote server after pushing:

1. When code is pushed to any branch, the CI/CD pipeline runs tests and builds the application
2. For pushes to the main branch, the workflow also deploys to production
3. Pull requests trigger deployments to the staging environment

The pre-push hook ensures that the code passes local tests before pushing to GitHub, where GitHub Actions workflows will run.

You can also manually trigger and validate workflows using:

```bash
# Set your GitHub token first
export GITHUB_TOKEN=your_github_token_here

# Run and validate workflows remotely
npm run test:workflows
```

This script triggers each workflow using the GitHub API and waits for its completion, reporting success or failure. It's useful for testing workflow changes without committing code.

### Browser Compatibility

The integration tests use Chrome in headless mode. The test system will automatically detect the installed Chrome version and use a compatible ChromeDriver. This ensures tests can run on different environments (local development and CI/CD pipelines) regardless of Chrome version differences.

#### ChromeDriver Version Management

- **Local Development**: Typically uses Chrome v135, with ChromeDriver v135
- **GitHub Actions CI**: Typically uses Chrome v134, with ChromeDriver v134
- **Auto-detection**: Automatically detects installed Chrome version on each platform
- **Fallback Mechanism**: Uses appropriate version based on environment if detection fails

The system is configured to support multiple ChromeDriver versions simultaneously:

```json
"chromedriver": "^134.0.0 || ^135.0.0"
```

#### Troubleshooting ChromeDriver Issues

If you encounter issues with ChromeDriver compatibility:

```bash
# Reinstall dependencies to get the correct ChromeDriver
npm install

# Check your Chrome version
google-chrome --version

# Run tests with explicit Chrome version
CHROME_VERSION=134 npm run test:e2e

# Specify a custom ChromeDriver path if needed
CHROMEDRIVER_PATH=/path/to/chromedriver npm run test:e2e

# For CI environments, force CI mode
CI=true npm run test:e2e
```

#### How Version Detection Works

1. The system attempts to detect your Chrome version automatically
2. If successful, it selects the matching ChromeDriver
3. If detection fails, it uses a default version based on environment (134 for CI, 135 for local)
4. You can override this by setting the `CHROME_VERSION` environment variable

## PWA Features

- Offline support
- App manifest for installability
- Service worker with automatic updates
- Icons for various platforms

## Development with DevContainer and GitHub Codespaces

This template is fully configured for development with VS Code DevContainers and GitHub Codespaces.

### GitHub Codespaces

To start developing with GitHub Codespaces:

1. Click the "Code" button on your repository
2. Select the "Codespaces" tab
3. Click "Create codespace on main"

The environment will be automatically set up with all dependencies installed and the development server running.

### VS Code DevContainer

To use the DevContainer locally:

1. Install Docker and the VS Code Remote - Containers extension
2. Open the project in VS Code
3. Click the notification to reopen in container, or use the Command Palette (F1) to run "Remote-Containers: Reopen in Container"

The DevContainer includes:

- Node.js LTS
- Chrome for headless browser testing
- Git and GitHub CLI
- Common development tools and utilities
- Pre-configured VS Code settings and extensions
- Claude Code CLI and VS Code extension

### Features

- Automatic port forwarding for the development server
- Pre-configured linting and formatting
- Git authentication and credential helpers
- Convenient aliases for common commands
- Isolated, reproducible development environment

### Claude Code Integration

The DevContainer and Codespaces environments include Claude Code for AI-assisted development:

1. **Authentication** (two options):
   - **Interactive Login**: Simply run `claude` to start the login wizard
   - **API Key**: Alternatively, create an API key at [Anthropic Console](https://console.anthropic.com/settings/keys)
     and set it as the `ANTHROPIC_API_KEY` environment variable or Codespaces secret

2. **Using Claude Code**:
   - In VS Code: Use the Claude Code extension (pre-installed)
   - In terminal: Use these commands:
     - `claude` - Run Claude Code CLI
     - `claude-chat` - Start interactive chat
     - `claude-init` - Initialize with project context
     - `claude-on` - Run on specific file or directory

3. **Features**:
   - In-editor context-aware assistance
   - Full codebase knowledge for more accurate help
   - Improved troubleshooting and debugging assistance
   - Automatic IDE integration
   
See `.github/CLAUDE_CODE_GUIDE.md` for detailed usage instructions.

## Automated Issue Implementation with Claude

This repository includes an automated GitHub Actions workflow that uses Claude AI to implement solutions for GitHub issues labeled with "claude".

### How It Works

1. An issue is created with detailed requirements
2. A repository maintainer adds the "claude" label
3. Claude automatically:
   - Analyzes the issue
   - Implements the requested changes
   - Creates a pull request
   - Links the PR back to the issue

### Usage for Contributors

- Create detailed issues using our templates
- Include specific acceptance criteria
- Maintainers will evaluate if the issue is suitable for Claude
- If appropriate, a maintainer will add the "claude" label

### For Maintainers

Only repository maintainers can add the "claude" label, which triggers the automation. 

```
⚠️ Important: The repository must have the ANTHROPIC_API_KEY secret configured.
```

See `.github/CLAUDE_AUTOMATION.md` for complete documentation.

## License

MIT
