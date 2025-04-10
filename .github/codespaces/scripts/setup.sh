#!/bin/bash

# Codespaces setup script

echo "Setting up TypeScript PWA development environment..."

# Install required npm packages
npm install

# Configure git user
if [ -n "$GITHUB_USER" ]; then
  git config --global user.name "$GITHUB_USER"
  echo "Git user name set to: $GITHUB_USER"
fi

if [ -n "$GITHUB_EMAIL" ]; then
  git config --global user.email "$GITHUB_EMAIL"
  echo "Git user email set to: $GITHUB_EMAIL"
fi

# Set up Git credential helper
git config --global credential.helper "store --file ~/.git-credentials"

# Set up GitHub CLI
if command -v gh &> /dev/null; then
  # If GITHUB_TOKEN is set, authenticate gh cli
  if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | gh auth login --with-token
    echo "GitHub CLI authenticated using token"
  fi
else
  echo "GitHub CLI not found. Skipping authentication."
fi

# Add development conveniences to .bashrc
cat << 'EOF' >> ~/.bashrc

# Aliases for TypeScript PWA development
alias dev="npm run dev"
alias build="npm run build"
alias test="npm run test"
alias lint="npm run lint"
alias preview="npm run preview"
alias deploy:dev="npm run deploy:dev"

# Claude Code aliases
alias claude-cc="claude"
alias claude-chat="claude chat"
alias claude-help="claude --help"

# Function to run Claude Code on a file or directory
claude-on() {
  if [ -z "$1" ]; then
    echo "Usage: cc-on <file_or_directory> [prompt]"
    return 1
  fi
  
  local target="$1"
  shift
  
  if [ -f "$target" ] || [ -d "$target" ]; then
    claude "$target" "$@"
  else
    echo "Error: $target is not a valid file or directory"
    return 1
  fi
}

# Function to initialize Claude Code with project context
claude-init() {
  local dir=${1:-.}
  echo "Initializing Claude Code with project context from $dir"
  claude "$dir" "Analyze this codebase and provide a summary of the project structure and key components."
}

# Show current GitHub status
gh_status() {
  echo "GitHub User: $(git config user.name)"
  echo "GitHub Email: $(git config user.email)"
  echo "GitHub Auth Status: $(gh auth status 2>&1 | grep -o 'Logged in.*')"
}

# Welcome message
if [ -n "$CODESPACES" ]; then
  clear
  echo "🚀 Welcome to your TypeScript PWA Codespace!"
  echo "-------------------------------------"
  echo "📋 Quick commands:"
  echo "  • dev       - Start development server"
  echo "  • build     - Build for production"
  echo "  • test      - Run tests"
  echo "  • lint      - Check code quality"
  echo "  • deploy:dev - Deploy to dev environment (requires GITHUB_TOKEN)"
  echo "  • gh_status - Check GitHub authentication status"
  echo ""
  echo "🤖 Claude Code commands:"
  echo "  • claude       - Run Claude Code CLI"
  echo "  • claude-chat  - Start interactive chat"
  echo "  • claude-init  - Initialize with project context"
  echo "  • claude-on    - Run on specific file or directory"
  echo "-------------------------------------"
  echo "Your dev server will start automatically. Access it via the Ports tab."
  
  # Check if Claude Code is installed and set up
  if command -v claude &> /dev/null; then
    if [ -n "$ANTHROPIC_API_KEY" ]; then
      echo "✅ ANTHROPIC_API_KEY is set. Claude Code is ready to use."
      echo "   Run 'claude' to start using Claude Code CLI."
    else
      echo "ℹ️ Claude Code is installed but requires authentication."
      echo "   You can either:"
      echo "   1. Set ANTHROPIC_API_KEY in Codespaces secrets (recommended)"
      echo "   2. Run 'claude' to start the login wizard"
    fi
  else
    echo "⚠️ Claude Code CLI not found. Please run 'npm install -g @anthropic-ai/claude-code'"
  fi
fi
EOF

# Make the bash prompt nicer
echo 'export PS1="\[\033[01;34m\]\w\[\033[00m\]\$ "' >> ~/.bashrc

# Make script executable
chmod +x ./scripts/deploy-dev.js

echo "Setup complete! 🎉"