#!/bin/bash

# Check if act is already installed
if command -v act &> /dev/null; then
  echo "✅ Act is already installed"
  exit 0
fi

echo "📦 Installing Act..."

# Create temporary directory
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR" || exit 1

# Get latest release download URL for Linux x86_64
echo "Downloading Act..."
if command -v curl &> /dev/null; then
  curl -s -L -o act.tar.gz "https://github.com/nektos/act/releases/latest/download/act_Linux_x86_64.tar.gz"
elif command -v wget &> /dev/null; then
  wget -q -O act.tar.gz "https://github.com/nektos/act/releases/latest/download/act_Linux_x86_64.tar.gz"
else
  echo "❌ Error: Neither curl nor wget is available"
  exit 1
fi

# Extract and install
tar -xzf act.tar.gz
chmod +x act

# Install to user's bin directory if possible, otherwise use local directory
if [ -d "$HOME/bin" ] && [[ ":$PATH:" == *":$HOME/bin:"* ]]; then
  mv act "$HOME/bin/"
  echo "✅ Act installed to $HOME/bin/act"
elif [ -d "$HOME/.local/bin" ] && [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
  mv act "$HOME/.local/bin/"
  echo "✅ Act installed to $HOME/.local/bin/act"
else
  # Create directory in home and add to PATH for current session
  mkdir -p "$HOME/.local/bin"
  mv act "$HOME/.local/bin/"
  export PATH="$HOME/.local/bin:$PATH"
  
  # Add to .bashrc for future sessions if it's not already there
  if ! grep -q "PATH=\$HOME/.local/bin:\$PATH" "$HOME/.bashrc"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  fi
  
  echo "✅ Act installed to $HOME/.local/bin/act and added to PATH"
  echo "   You may need to restart your shell or run 'source ~/.bashrc' to use Act"
fi

# Create default Act configuration to avoid interactive prompts
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

# Clean up
cd - > /dev/null
rm -rf "$TMP_DIR"
