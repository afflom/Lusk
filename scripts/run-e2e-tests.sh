#!/bin/bash

# Script to run E2E tests with dynamic port detection
# This automatically finds an available port to run the Vite preview server

# Build the app
echo "Building the application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Find an available port using our Node.js port finder
echo "Finding available port for the preview server..."
PORT=$(node scripts/find-port.js)

if [ -z "$PORT" ] || [ "$PORT" == "-1" ]; then
  echo "❌ Failed to find an available port"
  exit 1
fi

echo "Using port $PORT for the preview server"

# Start the preview server on the selected port and capture its output
echo "Starting the preview server on port $PORT..."
# Use --host 0.0.0.0 to bind to all interfaces, required for CI environments
npx vite preview --port $PORT --host 0.0.0.0 > preview-output.log 2>&1 &
PREVIEW_PID=$!

# Give the server time to start up
echo "Waiting for server to start..."
# Try up to 10 times with 1 second intervals
for i in {1..10}; do
  # Try localhost first
  if curl -s http://localhost:$PORT > /dev/null; then
    echo "Server is responding on localhost:$PORT after $i attempts"
    break
  fi
  
  # In CI environments, also try 0.0.0.0
  if [ ! -z "$CI" ] && curl -s http://0.0.0.0:$PORT > /dev/null; then
    echo "Server is responding on 0.0.0.0:$PORT after $i attempts"
    break
  fi
  
  echo "Waiting for server to start (attempt $i)..."
  sleep 1
done

# Try to connect to the server directly to verify it's running
echo "Verifying server status..."
MAX_ATTEMPTS=5
ATTEMPT=1
SERVER_STARTED=""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  # First check if the server reports its URL in the log file
  SERVER_URL=$(cat preview-output.log 2>/dev/null | grep -m 1 "Local:" | grep -oE 'http://localhost:[0-9]+')
  
  if [ ! -z "$SERVER_URL" ]; then
    echo "✅ Server reports it's running at $SERVER_URL"
    SERVER_STARTED=$SERVER_URL
    break
  fi
  
  # Then try connecting directly to verify server is responding
  if curl -s http://localhost:$PORT >/dev/null; then
    echo "✅ Successfully connected to server on localhost:$PORT"
    SERVER_STARTED="http://localhost:$PORT"
    break
  fi
  
  # In CI environments, also try 0.0.0.0
  if [ ! -z "$CI" ] && curl -s http://0.0.0.0:$PORT >/dev/null; then
    echo "✅ Successfully connected to server on 0.0.0.0:$PORT"
    SERVER_STARTED="http://0.0.0.0:$PORT"
    break
  fi
  
  echo "Verifying server status (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
  ATTEMPT=$((ATTEMPT+1))
  sleep 1
done

if [ -z "$SERVER_STARTED" ]; then
  echo "❌ Failed to connect to server on port $PORT"
  # Print the preview-output.log for debugging
  echo "Contents of preview-output.log:"
  cat preview-output.log 2>/dev/null || echo "No log file found"
  
  # Print network diagnostics in CI environments
  if [ ! -z "$CI" ]; then
    echo "Network diagnostics in CI environment:"
    echo "Checking if port $PORT is listening:"
    netstat -tulpn | grep $PORT || echo "Port $PORT is not listening"
    echo "Checking localhost resolves:"
    getent hosts localhost || echo "localhost not in hosts"
    echo "Checking localhost ping:"
    ping -c 1 localhost || echo "Cannot ping localhost"
    echo "Checking 0.0.0.0 availability:"
    curl -v http://0.0.0.0:$PORT 2>&1 || echo "Cannot connect to 0.0.0.0:$PORT"
  fi
fi

if [ -z "$SERVER_STARTED" ]; then
  echo "❌ Failed to confirm server is running"
  echo "Killing preview server process..."
  kill $PREVIEW_PID 2>/dev/null
  exit 1
fi

echo "✅ Preview server running at $SERVER_STARTED"

# Export the port as an environment variable for WebDriver
export TEST_PORT=$PORT

# Detect Chrome version for ChromeDriver compatibility
if [ -z "$CHROME_VERSION" ]; then
  # Only try to detect if not already set
  DETECTED_VERSION=$(google-chrome --version | grep -oP 'Chrome \K[0-9]+' || echo "")
  if [ ! -z "$DETECTED_VERSION" ]; then
    export CHROME_VERSION=$DETECTED_VERSION
    echo "Detected Chrome version: $CHROME_VERSION"
  else
    # If detection fails, leave it unset and let ChromeDriver auto-detect
    echo "Could not detect Chrome version, using ChromeDriver auto-detection"
  fi
else
  echo "Using pre-set Chrome version: $CHROME_VERSION"
fi

echo "Running tests with Chrome version: $CHROME_VERSION and server port: $TEST_PORT"

# Run the integration tests
npm run test:integration

# Save the test result
TEST_RESULT=$?

# Kill the preview server
echo "Stopping preview server (PID: $PREVIEW_PID)..."
kill $PREVIEW_PID
wait $PREVIEW_PID 2>/dev/null

# Clean up the log file
rm -f preview-output.log

# Exit with the test result
echo "Tests completed with status code: $TEST_RESULT"
exit $TEST_RESULT