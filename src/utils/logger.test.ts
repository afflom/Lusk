import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger, {
  configure,
  resetConfig,
  getConfig,
  debug,
  info,
  warn,
  error,
  disableLogging,
  formatMessage,
  shouldLog,
} from './logger';

describe('logger', () => {
  // Spy on console methods
  const originalConsole = global.console;
  const mockConsole = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    // Reset config before each test
    resetConfig();

    // Mock console methods
    global.console = { ...originalConsole, ...mockConsole } as typeof global.console;

    // Clear mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore console methods
    global.console = originalConsole;
  });

  describe('configuration', () => {
    it('should use default config initially', () => {
      const config = getConfig();
      expect(config).toEqual({
        level: 'info',
        enableTimestamp: true,
        enabled: true,
      });
    });

    it('should update config correctly', () => {
      configure({ level: 'debug', enableTimestamp: false });
      const config = getConfig();
      expect(config).toEqual({
        level: 'debug',
        enableTimestamp: false,
        enabled: true,
      });
    });

    it('should reset config to defaults', () => {
      configure({ level: 'error', enableTimestamp: false });
      resetConfig();
      const config = getConfig();
      expect(config).toEqual({
        level: 'info',
        enableTimestamp: true,
        enabled: true,
      });
    });
  });

  describe('formatMessage', () => {
    it('should add timestamp when enabled', () => {
      configure({ enableTimestamp: true });
      const result = formatMessage('test message');
      expect(result).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] test message/);
    });

    it('should not add timestamp when disabled', () => {
      configure({ enableTimestamp: false });
      const result = formatMessage('test message');
      expect(result).toBe('test message');
    });
  });

  describe('shouldLog', () => {
    it('should return false when logging is disabled', () => {
      configure({ enabled: false });
      expect(shouldLog('error')).toBe(false);
    });

    it('should respect log level hierarchy', () => {
      configure({ level: 'warn', enabled: true });
      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(false);
      expect(shouldLog('warn')).toBe(true);
      expect(shouldLog('error')).toBe(true);
    });
  });

  describe('logging methods', () => {
    it('should not log debug messages when level is info', () => {
      configure({ level: 'info' });
      debug('Debug message');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      configure({ level: 'info' });
      info('Info message');
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle additional parameters', () => {
      configure({ level: 'debug', enableTimestamp: false });
      debug('Debug message', { detail: 'extra info' });
      expect(mockConsole.debug).toHaveBeenCalledWith('Debug message', { detail: 'extra info' });
    });

    it('should handle error objects', () => {
      configure({ level: 'error', enableTimestamp: false });
      const testError = new Error('Test error');
      error('Error occurred', testError);
      expect(mockConsole.error).toHaveBeenCalledWith('Error occurred', testError);
    });
  });

  describe('disableLogging', () => {
    it('should temporarily disable logging', () => {
      configure({ level: 'info' });
      info('First message');
      expect(mockConsole.info).toHaveBeenCalledTimes(1);

      const restore = disableLogging();
      info('Second message');
      expect(mockConsole.info).toHaveBeenCalledTimes(1); // Still 1, no new calls

      restore();
      info('Third message');
      expect(mockConsole.info).toHaveBeenCalledTimes(2); // Now 2 calls
    });
  });

  describe('default export', () => {
    it('should export all methods', () => {
      expect(logger.configure).toBe(configure);
      expect(logger.resetConfig).toBe(resetConfig);
      expect(logger.getConfig).toBe(getConfig);
      expect(logger.debug).toBe(debug);
      expect(logger.info).toBe(info);
      expect(logger.warn).toBe(warn);
      expect(logger.error).toBe(error);
      expect(logger.disableLogging).toBe(disableLogging);
    });
  });
});
