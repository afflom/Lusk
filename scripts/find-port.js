#!/usr/bin/env node

// Simple script to find an available port
// This outputs ONLY the port number for easy capture in shell scripts

import { createServer } from 'net';

async function findAvailablePort(startPort = 4173) {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = createServer()
          .once('error', (err) => {
            server.close();
            if (err.code === 'EADDRINUSE') {
              resolve(false);
            } else {
              reject(err);
            }
          })
          .once('listening', () => {
            server.close();
            resolve(true);
          })
          .listen(port);
      });

      // If we get here, the port is available
      return port;
    } catch (err) {
      // Skip this port and try the next one
      continue;
    }
  }

  // No ports available
  return -1;
}

// Find and output only the port number
findAvailablePort()
  .then((port) => {
    if (port > 0) {
      process.stdout.write(port.toString());
    } else {
      process.stderr.write('No available port found');
      process.exit(1);
    }
  })
  .catch((err) => {
    process.stderr.write(`Error: ${err.message}`);
    process.exit(1);
  });
