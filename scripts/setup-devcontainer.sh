#!/bin/bash

# Script to help set up the local DevContainer environment

echo "Setting up TypeScript PWA DevContainer environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed. Please install Docker first."
  echo "Visit https://docs.docker.com/get-docker/ for instructions."
  exit 1
fi

# Check if VS Code is installed
if ! command -v code &> /dev/null; then
  echo "❌ VS Code is not installed. Please install VS Code first."
  echo "Visit https://code.visualstudio.com/download for instructions."
  exit 1
fi

# Check if Remote - Containers extension is installed
if ! code --list-extensions | grep -q "ms-vscode-remote.remote-containers"; then
  echo "Installing VS Code Remote - Containers extension..."
  code --install-extension ms-vscode-remote.remote-containers
fi

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️ GITHUB_TOKEN environment variable is not set."
  echo "Setting this token is recommended for GitHub operations."
  echo "You can create a token at: https://github.com/settings/tokens"
  echo "Then add it to your environment with: export GITHUB_TOKEN=your_token"
fi

echo "✅ Setup complete! You can now open this project in VS Code and use the 'Remote-Containers: Reopen in Container' command."

# If we're already in VS Code, suggest reopening in container
if [ -n "$VSCODE_CLI" ] || [ -n "$VSCODE_PID" ]; then
  echo "Would you like to reopen this project in a DevContainer now? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    code --remote-containers-reopen
  fi
fi