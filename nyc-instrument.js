/**
 * Workaround for coverage instrumentation issues
 * This file is used during tests to ensure proper instrumentation of code
 */

// Flag to indicate instrumentation is active
window.nyc_instrument = true;

// Enable proper branch coverage detection
// Use globalThis which works in both browser and Node.js environments
if (typeof globalThis !== 'undefined') {
  // eslint-disable-next-line no-undef
  globalThis.__coverage__ = globalThis.__coverage__ || {};
}

// This file is imported by the test setup to ensure coverage works correctly
