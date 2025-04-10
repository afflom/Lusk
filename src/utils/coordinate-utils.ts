/**
 * Universal coordinates calculation utility
 *
 * This module provides helper functions for converting universal number
 * coordinates to a serializable format suitable for JSON exchange.
 */
import { UniversalNumber } from './math-lib-wrapper';
import * as logger from './logger';

/**
 * Represents a serializable version of UniversalNumber coordinates
 */
export interface SerializableCoordinates {
  /** Array of prime-exponent pairs as [prime, exponent] */
  factorization: [number, number][];
  /** Whether the number is negative */
  isNegative: boolean;
}

/**
 * Convert a UniversalNumber's coordinates to a serializable format
 * @param numString - The number as a string
 * @returns A serializable object with factorization array and sign
 * @throws Error if the input is invalid or conversion fails
 */
export function getSerializableCoordinates(numString: string): SerializableCoordinates {
  try {
    if (!numString || typeof numString !== 'string') {
      throw new Error('Invalid input: number string is required');
    }

    // Create universal number
    const num = UniversalNumber.fromString(numString);

    if (!num) {
      throw new Error('Failed to create UniversalNumber from input');
    }

    // Get coordinates
    const coordinates = num.getCoordinates();

    // Convert factorization to array for proper serialization
    const factorizationArray = Array.from(coordinates.factorization.entries()).map(
      ([prime, exp]) => [Number(prime), Number(exp)] as [number, number]
    );

    // Create serializable object
    return {
      factorization: factorizationArray,
      isNegative: coordinates.isNegative,
    };
  } catch (error) {
    logger.error(
      'Error converting to serializable coordinates:',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
