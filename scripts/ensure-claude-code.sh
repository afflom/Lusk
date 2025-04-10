#!/bin/bash

# Check if being run as a pre-commit hook with piped input
if [ -t 0 ]; then
  # Script being run directly (not as pre-commit hook), so install Claude Code
  # Check if Claude Code is installed
  if ! command -v claude &> /dev/null; then
    echo "Claude Code CLI not found, installing..."
    npm install -g @anthropic-ai/claude-code
    
    if [ $? -ne 0 ]; then
      echo "❌ Failed to install Claude Code CLI. Please install it manually:"
      echo "npm install -g @anthropic-ai/claude-code"
      exit 1
    fi
    
    echo "✅ Claude Code CLI installed successfully."
  else
    echo "✅ Claude Code CLI is already installed."
  fi

  # Give instructions for authentication
  if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY environment variable is set."
    echo "Claude Code will use this API key for authentication."
  else
    echo "ℹ️ No ANTHROPIC_API_KEY environment variable found."
    echo "You have two options for authentication:"
    echo ""
    echo "Option 1: Use the interactive login wizard (recommended):"
    echo "  Run: claude"
    echo "  Follow the on-screen instructions to log in with your Anthropic account."
    echo ""
    echo "Option 2: Set an API key environment variable:"
    echo "  1. Create an API key at https://console.anthropic.com/settings/keys"
    echo "  2. Set it in your environment: export ANTHROPIC_API_KEY=your_key_here"
    echo "  3. For persistent setup, add this to your .bashrc or .profile"
    echo ""
  fi

  # Inform about VS Code extension
  echo "ℹ️ To use Claude Code in VS Code, make sure the extension is installed:"
  echo "  Extension ID: anthropic.claude-code-vscode"
  echo ""
  echo "For more information, see: .github/CLAUDE_CODE_GUIDE.md"

  # Check if running in non-interactive mode
  if [ "$1" == "--no-interactive" ]; then
    echo "Running in non-interactive mode. Setup complete."
    exit 0
  fi

  # Offer to start Claude Code
  echo ""
  echo "Would you like to start Claude Code now? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    claude
  fi
else
  # Being used as a pre-commit hook with piped input
  # Get the code from stdin
  code=$(cat)

  # Skip if there's no code
  if [ -z "$code" ]; then
    exit 0
  fi

  # Create prompt for Claude
  prompt=$(cat <<EOF
Analyze this code for implementation stubs, mock features, placeholder implementations, faked tests, or any indication that this code is not production-ready. 

Look for:
1. TODO, FIXME, or similar comments
2. Function stubs (empty or minimal implementations)
3. Mock or dummy data instead of real implementations
4. Placeholder or temporary code
5. Test stubs or incomplete test coverage
6. Hardcoded values that should be configurable

If you find any issues, exit with a non-zero code and print your analysis to stderr. Otherwise, exit with 0.

RESPONSE TEMPLATE:
{
  "status": "PASS|FAIL", 
  "output_stream": "stdout|stderr",
  "issues": [],
  "suggestions": []
}

For each issue, provide:
- The problematic code
- Why it's an issue
- Suggestions for proper implementation based on the codebase's patterns

Code to analyze:
$code
EOF
)

  # Call Claude in non-interactive mode
  # Write to a file then cat it to Claude to avoid argument list too long error
  temp_prompt_file=$(mktemp)
  echo "$prompt" > "$temp_prompt_file"
  result=$(cat "$temp_prompt_file" | claude --print)
  rm -f "$temp_prompt_file"

  # Extract the status from the JSON response
  status=$(echo "$result" | grep -o '"status": *"[^"]*"' | cut -d '"' -f 4)
  output_stream=$(echo "$result" | grep -o '"output_stream": *"[^"]*"' | cut -d '"' -f 4)

  # If status is FAIL, print to the appropriate stream and exit with error
  if [ "$status" = "FAIL" ]; then
    if [ "$output_stream" = "stderr" ]; then
      echo "$result" >&2
      exit 1
    else
      echo "$result"
      exit 1
    fi
  fi

  # Otherwise exit successfully
  exit 0
fi