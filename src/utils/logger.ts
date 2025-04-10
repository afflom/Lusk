/**
 * Production-ready logger utility with configurable log levels
 * Supports both browser and Node.js environments
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enabled: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  enableTimestamp: true,
  enabled: true,
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Sets the logger configuration
 */
export const configure = (newConfig: Partial<LoggerConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Resets logger to default configuration
 */
export const resetConfig = (): void => {
  config = { ...DEFAULT_CONFIG };
};

/**
 * Returns the current logger configuration
 */
export const getConfig = (): LoggerConfig => {
  return { ...config };
};

/**
 * Formats a log message with optional timestamp
 */
export const formatMessage = (message: string): string => {
  if (config.enableTimestamp) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
  }
  return message;
};

/**
 * Determines if a message should be logged based on level
 */
export const shouldLog = (level: LogLevel): boolean => {
  return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.level];
};

/**
 * Log to appropriate console based on environment
 */
const logToConsole = (level: LogLevel, message: string, optionalParams?: unknown[]): void => {
  const formattedMessage = formatMessage(message);

  // Browser environment
  if (typeof window !== 'undefined' && window.console) {
    if (optionalParams && optionalParams.length > 0) {
      window.console[level](formattedMessage, ...optionalParams);
    } else {
      window.console[level](formattedMessage);
    }
  }
  // Node.js environment
  else if (typeof console !== 'undefined') {
    if (optionalParams && optionalParams.length > 0) {
      // eslint-disable-next-line no-console
      console[level](formattedMessage, ...optionalParams);
    } else {
      // eslint-disable-next-line no-console
      console[level](formattedMessage);
    }
  }
};

/**
 * Log a debug message
 */
export const debug = (message: string, ...optionalParams: unknown[]): void => {
  if (shouldLog('debug')) {
    logToConsole('debug', message, optionalParams);
  }
};

/**
 * Log an info message
 */
export const info = (message: string, ...optionalParams: unknown[]): void => {
  if (shouldLog('info')) {
    logToConsole('info', message, optionalParams);
  }
};

/**
 * Log a warning message
 */
export const warn = (message: string, ...optionalParams: unknown[]): void => {
  if (shouldLog('warn')) {
    logToConsole('warn', message, optionalParams);
  }
};

/**
 * Log an error message
 */
export const error = (message: string, err?: Error): void => {
  if (shouldLog('error')) {
    if (err) {
      logToConsole('error', message, err instanceof Error ? [err] : [err]);
    } else {
      logToConsole('error', message);
    }
  }
};

/**
 * Temporarily disable all logging
 * @returns Function to restore previous logging state
 */
export const disableLogging = (): (() => void) => {
  const previousState = config.enabled;
  config.enabled = false;
  return () => {
    config.enabled = previousState;
  };
};

export default {
  configure,
  resetConfig,
  getConfig,
  debug,
  info,
  warn,
  error,
  disableLogging,
};
