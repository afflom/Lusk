/**
 * Tests for the coordinate-utils module
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { getSerializableCoordinates } from './coordinate-utils';
import { UniversalNumber } from './math-lib-wrapper';
import * as logger from './logger';

// Mock the UniversalNumber class
vi.mock('./math-lib-wrapper', () => {
  return {
    UniversalNumber: {
      fromString: vi.fn((str) => {
        if (!str || str === 'invalid') {
          return null;
        }

        // Sample coordinates for testing
        if (str === '42') {
          return {
            getCoordinates: () => ({
              factorization: new Map([
                [2, 1],
                [3, 1],
                [7, 1],
              ]),
              isNegative: false,
            }),
          };
        }

        if (str === '-30') {
          return {
            getCoordinates: () => ({
              factorization: new Map([
                [2, 1],
                [3, 1],
                [5, 1],
              ]),
              isNegative: true,
            }),
          };
        }

        // Default for other valid inputs
        return {
          getCoordinates: () => ({
            factorization: new Map([
              [2, 1],
              [3, 1],
            ]),
            isNegative: false,
          }),
        };
      }),
    },
  };
});

describe('coordinate-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should convert universal number coordinates to serializable format', () => {
    const result = getSerializableCoordinates('42');

    // Verify the result is correctly formatted
    expect(result).toEqual({
      factorization: [
        [2, 1],
        [3, 1],
        [7, 1],
      ],
      isNegative: false,
    });

    // Verify the UniversalNumber.fromString was called with the correct argument
    expect(UniversalNumber.fromString).toHaveBeenCalledWith('42');
  });

  it('should handle negative numbers correctly', () => {
    const result = getSerializableCoordinates('-30');

    expect(result).toEqual({
      factorization: [
        [2, 1],
        [3, 1],
        [5, 1],
      ],
      isNegative: true,
    });
  });

  it('should throw an error for empty input', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    expect(() => getSerializableCoordinates('')).toThrow('Invalid input');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should throw an error for non-string input', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    // @ts-expect-error - Testing invalid input types
    expect(() => getSerializableCoordinates(42)).toThrow('Invalid input');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should throw an error if UniversalNumber creation fails', () => {
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    expect(() => getSerializableCoordinates('invalid')).toThrow('Failed to create UniversalNumber');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should handle errors in coordinate retrieval', () => {
    // Mock UniversalNumber to throw on getCoordinates
    vi.mocked(UniversalNumber.fromString).mockImplementationOnce(() => ({
      getCoordinates: () => {
        throw new Error('Coordinates error');
      },
    }));

    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    expect(() => getSerializableCoordinates('error-case')).toThrow('Coordinates error');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should handle a range of valid numeric inputs', () => {
    // Test large number
    expect(getSerializableCoordinates('1000000')).toHaveProperty('factorization');

    // Test decimal number (should be handled by the UniversalNumber class)
    expect(getSerializableCoordinates('123.456')).toHaveProperty('factorization');

    // Test scientific notation
    expect(getSerializableCoordinates('1e6')).toHaveProperty('factorization');
  });
});
