# Claude Code Guide

This guide explains how to use Claude Code in this repository for AI-assisted development.

## What is Claude Code?

Claude Code is Anthropic's AI assistant specialized for software development tasks. It can help you with:

- Understanding the codebase
- Writing and improving code
- Debugging issues
- Creating tests
- Implementing features
- Answering programming questions

## Setup and Authentication

This project is pre-configured to work with Claude Code in both DevContainers and GitHub Codespaces.

### Authentication Options

You have two ways to authenticate:

1. **Interactive Login (Recommended)**:
   - Run `claude` in your terminal
   - Follow the on-screen instructions to log in with your Anthropic account

2. **API Key**:
   - Generate an API key at [Anthropic Console](https://console.anthropic.com/settings/keys)
   - Set it as an environment variable:
     ```bash
     export ANTHROPIC_API_KEY=your_key_here
     ```
   - For persistent setup, add this to your `.bashrc` or `.profile`
   - For GitHub Codespaces, add it as a Codespaces secret

## Using Claude Code

### VS Code Extension

The Claude Code VS Code extension is pre-installed in the DevContainer and Codespaces environments.

- Use the Claude Code panel in VS Code
- Highlight code and right-click to access Claude Code context menu options
- Use keyboard shortcuts for quick access

### CLI Commands

The following commands are available in your terminal:

- `claude` - Start the Claude Code CLI
- `claude-chat` - Begin an interactive chat session
- `claude-init` - Initialize Claude with project context
- `claude-on <file/dir>` - Run Claude on a specific file or directory

### Best Practices

For the best results with Claude Code:

1. **Be specific** in your requests
2. **Provide context** when asking questions about the codebase
3. **Specify file paths** when referring to code
4. **Review suggestions** before implementing them
5. **Ask for explanations** if you don't understand something

## Example Use Cases

### Understanding the Codebase

```bash
claude "Explain how the PWA service worker system works in this project"
```

### Implementing Features

```bash
claude "Help me implement a new counter component that includes a reset button"
```

### Creating Tests

```bash
claude "Write unit tests for the utils/config.ts file"
```

### Debugging

```bash
claude "Debug why my service worker isn't registering in development mode"
```

## Environment Variables

Claude Code can access environment variables that are set for the current session. The following environment variables are particularly relevant:

- `ANTHROPIC_API_KEY` - Your Anthropic API key for authentication
- `GITHUB_TOKEN` - GitHub token for repository operations

See `.env.example` for a complete list of supported environment variables.

## Additional Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude/code)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [VS Code Extension Documentation](https://docs.anthropic.com/claude/code/vs-code-extension)