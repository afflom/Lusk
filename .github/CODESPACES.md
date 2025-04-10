# GitHub Codespaces

This project is configured for easy development with GitHub Codespaces. When you open this project in a codespace, the environment is automatically set up with all the necessary tools and dependencies.

## What's Included

- Node.js LTS
- Chrome for browser testing
- GitHub CLI
- VS Code extensions for TypeScript/JavaScript development
- Pre-configured settings for linting, formatting, and testing

## Getting Started

The development server starts automatically when your codespace launches. You can access it through the "Ports" tab, where port 5173 is forwarded and labeled as "Vite Dev Server".

## Available Commands

The following aliases are available in your terminal:

- `dev` - Start the development server
- `build` - Build for production
- `test` - Run tests
- `lint` - Check code quality
- `deploy:dev` - Deploy to dev environment (requires GITHUB_TOKEN)
- `gh_status` - Check GitHub authentication status

## GitHub Authentication

If you've provided a GitHub token through Codespaces secrets, the environment will be automatically authenticated with GitHub. This allows you to use Git operations and the GitHub CLI without additional authentication.

To check your authentication status, run `gh_status` in the terminal.

## Environment Variables

For deploying to the dev environment, you'll need a GitHub token with appropriate permissions. You can add this as a Codespace secret:

1. Go to your repository settings
2. Navigate to Codespaces
3. Add a new secret named `GITHUB_TOKEN` with your personal access token

## Additional Resources

- [VS Code Remote Development](https://code.visualstudio.com/docs/remote/remote-overview)
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)