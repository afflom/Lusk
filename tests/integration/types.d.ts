/**
 * Type declarations for test environment
 */

interface Window {
  __console_errors?: string[];
  __console_warnings?: string[];
  __unhandledErrors?: any[];
  __customElementErrors?: any[];
  __app_errors?: any[];
  __critical_errors?: string[];
  __injectTestError?: () => void;
}

interface HTMLScriptElement {
  error?: any;
}

interface Element {
  // Add src property to Element for test scripts
  src?: string;
  value?: string;
}

interface WebComponentStatus {
  appShellStatus: string;
  mathDemoStatus: string;
  hasErrors: boolean;
  counterStatus?: string;
  appRootStatus?: string;
}

// Add types for test results
declare module '@wdio/globals' {
  interface Test {
    passed: boolean;
  }
}

// TypeScript doesn't provide proper types for browser.execute results
interface CoordinatesResult {
  success: boolean;
  result: {
    factorization: [number, number][];
    isNegative: boolean;
  };
  error?: string;
  text?: string;
}

// Allow filtering unknown types in tests
interface Array<T> {
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
}
