/**
 * Utility module for working with coordinate calculations in testing environments
 * 
 * @module test-coordinates
 * @description This utility helps with coordinate calculations in tests by providing
 *              a wrapper around the coordinate-utils module with additional
 *              testing-specific functionality.
 */

import { getSerializableCoordinates } from '../../utils/coordinate-utils';

/**
 * Get coordinates in a format suitable for testing
 * @param {string} numString - The number as a string
 * @returns {Object} A test-ready coordinates object
 */
export function getTestCoordinates(numString) {
  // Use the main utility from coordinate-utils.ts
  const coords = getSerializableCoordinates(numString);
  
  // Add testing-specific information
  return {
    ...coords,
    // Add a string representation for easier test debugging
    stringRepresentation: formatCoordinatesForTest(coords),
    // Flag to identify it came from the test utility
    isTestFormat: true
  };
}

/**
 * Format coordinates for display in test output
 * @param {Object} coords - The coordinates object
 * @returns {string} A formatted string representation
 */
function formatCoordinatesForTest(coords) {
  const factors = coords.factorization
    .map(([prime, exp]) => `${prime}${exp > 1 ? `^${exp}` : ''}`)
    .join(' × ');
  
  return `${coords.isNegative ? '-' : ''}(${factors})`;
}