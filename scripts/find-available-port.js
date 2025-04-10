#!/usr/bin/env node

/**
 * Utility to find an available port
 *
 * This script will find an available port starting from a specified base port.
 * It can be used both as a module and as a CLI script.
 */

import { createServer } from 'net';

/**
 * Checks if a port is available
 * @param {number} port Port to check
 * @returns {Promise<boolean>} True if the port is available, false otherwise
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        // Unexpected error
        console.error(`Unexpected error checking port ${port}:`, err.message);
        resolve(false);
      }
    });

    server.once('listening', () => {
      // Close the server and resolve with true (port is available)
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Finds the next available port starting from basePort
 * @param {number} basePort Starting port number
 * @param {number} maxAttempts Maximum number of ports to check
 * @returns {Promise<number>} Available port number or -1 if none found
 */
async function findAvailablePort(basePort = 4173, maxAttempts = 100) {
  console.log(`Looking for available port starting from ${basePort}...`);

  for (let i = 0; i < maxAttempts; i++) {
    const portToCheck = basePort + i;
    const available = await isPortAvailable(portToCheck);

    if (available) {
      console.log(`✅ Port ${portToCheck} is available`);
      return portToCheck;
    }

    console.log(`❌ Port ${portToCheck} is in use`);
  }

  console.error(`❌ Couldn't find available port after ${maxAttempts} attempts`);
  return -1;
}

// Run as a CLI if this is the main module
const isMainModule = process.argv[1] && process.argv[1].endsWith('find-available-port.js');
if (isMainModule) {
  const basePort = process.argv[2] ? parseInt(process.argv[2], 10) : 4173;

  findAvailablePort(basePort)
    .then((port) => {
      if (port > 0) {
        // Simply output the port number, so it can be captured in shell scripts
        console.log(port);
        process.exit(0);
      } else {
        console.error('No available port found');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Error finding available port:', err);
      process.exit(1);
    });
}

export { isPortAvailable, findAvailablePort };
