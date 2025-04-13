/**
 * ESM wrapper for the @uor-foundation/math-js library
 * This resolves CommonJS vs ESM interoperability issues by providing a clean ESM interface
 * with proper error handling and type definitions.
 */
import * as logger from './logger';

// Import the library but don't use it directly - use the initialized components
import * as MathJSImport from '@uor-foundation/math-js';

/**
 * Class that manages the math library components
 * Using a class forces the initialization flow to be more structured and testable
 */
export class MathLibrary {
  private static instance: MathLibrary;
  private _mathJS: typeof MathJSImport;

  // Define proper types based on the library's TypeScript definitions
  private _UniversalNumber: typeof MathJSImport.UniversalNumber | null;
  private _numberTheory: typeof MathJSImport.numberTheory | null;
  private _initialized: boolean = false;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this._mathJS = MathJSImport;
    this._UniversalNumber = null;
    this._numberTheory = null;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MathLibrary {
    if (!MathLibrary.instance) {
      MathLibrary.instance = new MathLibrary();
    }
    return MathLibrary.instance;
  }

  /**
   * Initialize the library components
   * This method is separate from the constructor to allow for better error handling and testing
   */
  public initialize(): boolean {
    if (this._initialized) {
      return true;
    }

    try {
      // Check if MathJS exists
      if (!this._mathJS) {
        throw new Error('Math library module not found');
      }

      // Explicitly assign to variables
      this._UniversalNumber = this._mathJS.UniversalNumber;
      this._numberTheory = this._mathJS.numberTheory;

      // Check UniversalNumber
      if (!this._UniversalNumber) {
        throw new Error('Math library not properly loaded - UniversalNumber missing');
      }

      // Check numberTheory
      if (!this._numberTheory) {
        throw new Error('Math library not properly loaded - numberTheory missing');
      }

      // Mark as initialized
      this._initialized = true;

      // Log success
      logger.info('Math library loaded successfully');
      return true;
    } catch (error) {
      // Log the error
      logger.error(
        'Failed to load math library:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Rethrow for the caller to handle
      throw error;
    }
  }

  /**
   * Check if the library has been initialized
   */
  public get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get the UniversalNumber component
   * @throws Error if not initialized
   */
  public get UniversalNumber(): typeof MathJSImport.UniversalNumber {
    this.checkInitialized();
    if (!this._UniversalNumber) {
      throw new Error('UniversalNumber component not available');
    }
    return this._UniversalNumber;
  }

  /**
   * Get the numberTheory component
   * @throws Error if not initialized
   */
  public get numberTheory(): typeof MathJSImport.numberTheory {
    this.checkInitialized();
    if (!this._numberTheory) {
      throw new Error('numberTheory component not available');
    }
    return this._numberTheory;
  }

  /**
   * Get the original MathJS module
   * @throws Error if not initialized
   */
  public get mathJS(): typeof MathJSImport {
    this.checkInitialized();
    return this._mathJS;
  }

  /**
   * Check if the library is initialized and throw if not
   */
  private checkInitialized(): void {
    if (!this._initialized) {
      throw new Error('Math library not initialized');
    }
  }

  /**
   * Run test-specific instrumentation
   * Separate method for better component validation and diagnostic logging
   */
  public runTestInstrumentation(): void {
    try {
      // Explicitly check components regardless of environment
      // This ensures the tests can control the environment
      const hasUniversalNumber = !!this._UniversalNumber;
      const hasNumberTheory = !!this._numberTheory;

      // Check if components are available
      if (!hasUniversalNumber) {
        logger.debug('Instrumentation: UniversalNumber is missing');
      }

      if (!hasNumberTheory) {
        logger.debug('Instrumentation: numberTheory is missing');
      }

      // Log success or failure
      if (hasUniversalNumber && hasNumberTheory) {
        logger.debug('Instrumentation: All components available');
      } else {
        logger.debug('Instrumentation: Some components missing');
      }
    } catch (error) {
      logger.error(
        'Coverage instrumentation error:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Create and initialize the library instance
const mathLibrary = MathLibrary.getInstance();

// Multi-step initialization pattern for better error handling and control flow
// Step 1: Initialize the library
try {
  // Initialize the library components
  mathLibrary.initialize();
} catch (error) {
  // Log error already handled in initialize()
  // Implement graceful degradation for when math library fails
  logger.warn('Math library initialization failed, falling back to reduced functionality');

  // Set a flag or emit an event to notify the app about reduced functionality
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('math-library-degraded', {
        detail: { error: error instanceof Error ? error.message : String(error) },
      })
    );
  }
}

// Step 2: Run the instrumentation if in test mode (only if init succeeded)
if (mathLibrary.isInitialized && process.env.NODE_ENV === 'test') {
  try {
    // Run test instrumentation
    mathLibrary.runTestInstrumentation();
  } catch (error) {
    // This is already handled inside runTestInstrumentation
    // but we add this try/catch for extra safety/coverage
    logger.error(
      'Additional error handler:',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Export the components for easy access with proper typing
export const UniversalNumber = mathLibrary.isInitialized
  ? mathLibrary.UniversalNumber
  : (null as unknown as typeof MathJSImport.UniversalNumber);

export const numberTheory = mathLibrary.isInitialized
  ? mathLibrary.numberTheory
  : (null as unknown as typeof MathJSImport.numberTheory);

// Export the entire module for advanced usage
export default mathLibrary.isInitialized
  ? mathLibrary.mathJS
  : (null as unknown as typeof MathJSImport);
