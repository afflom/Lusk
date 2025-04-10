FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Install additional CLI tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    jq \
    curl \
    git \
    vim \
    zip \
    unzip \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages for development
RUN npm install -g npm@latest \
    http-server \
    @antfu/ni \
    typescript \
    vite \
    vitest \
    @anthropic-ai/claude-code && \
    # Create symlink for claude-code if it doesn't exist
    if [ ! -e /usr/local/bin/claude ]; then \
      ln -s $(which claude-code 2>/dev/null || echo "/usr/local/bin/claude-code") /usr/local/bin/claude 2>/dev/null || true; \
    fi

# Install Chrome for headless browser testing
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && curl -sSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb \
    && apt-get -y install --no-install-recommends /tmp/chrome.deb \
    && rm /tmp/chrome.deb \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Set up permissions for node user 
USER node

# Setup shell history and bash completion
RUN echo "alias ll='ls -alF'" >> ~/.bashrc \
    && echo "export PS1='\[\033[01;34m\]\w\[\033[00m\]\$ '" >> ~/.bashrc \
    && echo "export PATH=\$PATH:/workspaces/apps/node_modules/.bin" >> ~/.bashrc

# Prepare for GitHub authentication
RUN mkdir -p ~/.config/gh

WORKDIR /workspaces/apps