/**
 * ESM wrapper for the @uor-foundation/math-js library
 * This resolves CommonJS vs ESM interoperability issues by providing a clean ESM interface
 * with proper error handling and type definitions.
 */
import * as logger from './logger';

// Import the library
import * as MathJS from '@uor-foundation/math-js';

// Re-export with error handling
const { UniversalNumber, numberTheory } = MathJS;

// Log successful loading
try {
  if (!UniversalNumber || !numberTheory) {
    throw new Error('Math library not properly loaded');
  }
  logger.info('Math library loaded successfully');
} catch (error) {
  logger.error(
    'Failed to load math library:',
    error instanceof Error ? error : new Error(String(error))
  );
  throw error;
}

// Export the components
export { UniversalNumber, numberTheory };

// Re-export the entire module as default
export default MathJS;
