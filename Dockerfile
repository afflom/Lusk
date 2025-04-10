FROM node:18-slim

# Install essential tools and dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy package.json files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
# The ANTHROPIC_API_KEY should be passed at runtime, not hardcoded
# Example: docker run -e ANTHROPIC_API_KEY=$YOUR_KEY ...

# Default command
CMD ["bash"]