#!/bin/bash

# Ensure Act is installed
if ! command -v act &> /dev/null; then
  echo "⚙️ Act not found, installing..."
  bash "$(dirname "$0")/install-act.sh"
  
  # Re-check if installation was successful
  if ! command -v act &> /dev/null; then
    if [ -f "$HOME/.local/bin/act" ]; then
      export PATH="$HOME/.local/bin:$PATH"
    elif [ -f "$HOME/bin/act" ]; then
      export PATH="$HOME/bin:$PATH"
    else
      echo "❌ Failed to install Act"
      exit 1
    fi
  fi
fi

# Default workflow to run
WORKFLOW="deploy.yml"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --workflow)
      WORKFLOW="$2"
      shift 2
      ;;
    --list)
      echo "📋 Listing available workflows:"
      act -l
      exit 0
      ;;
    --help)
      echo "Usage: $0 [--workflow WORKFLOW_FILE] [--list] [--help]"
      echo ""
      echo "Options:"
      echo "  --workflow WORKFLOW_FILE  Specify the workflow file to run (default: deploy.yml)"
      echo "  --list                   List available workflows"
      echo "  --help                   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage information"
      exit 1
      ;;
  esac
done

echo "🚀 Running GitHub Actions workflow $WORKFLOW locally with Act..."

# Create Act config file if it doesn't exist to prevent interactive prompts
ACT_CONFIG_DIR="$HOME/.config/act"
ACT_CONFIG_FILE="$ACT_CONFIG_DIR/actrc"
if [ ! -f "$ACT_CONFIG_FILE" ]; then
  mkdir -p "$ACT_CONFIG_DIR"
  cat > "$ACT_CONFIG_FILE" << EOF
-P ubuntu-latest=node:18-slim
-P ubuntu-22.04=node:18-slim
--container-architecture linux/amd64
EOF
  echo "Created Act config file at $ACT_CONFIG_FILE"
fi

# Run the specified workflow with non-interactive mode
act -W ".github/workflows/$WORKFLOW" --artifact-server-path /tmp/artifacts -n

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ GitHub Actions workflow completed successfully!"
else
  echo "❌ GitHub Actions workflow failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
