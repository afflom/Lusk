import { numberTheory } from '../utils/math-lib-wrapper';
import { getSerializableCoordinates } from '../utils/coordinate-utils';
import * as logger from '../utils/logger';
import { THEME } from '../utils/constants';

/**
 * Custom element that provides a demo of mathematical operations
 * using the Universal Number library
 */
export class MathDemoElement extends HTMLElement {
  private inputValue = '';
  private operation = 'factorize';
  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });

    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      .math-demo {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        font-family: sans-serif;
      }
      
      .math-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      
      .math-form > * {
        margin: 0.25rem 0;
      }
      
      button {
        padding: 0.5rem 1rem;
        cursor: pointer;
        background-color: ${THEME.colors.primary};
        color: ${THEME.colors.text.primary};
        border: none;
        border-radius: ${THEME.borderRadius.sm};
      }
      
      .result-container {
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 0.25rem;
      }
      
      .result {
        font-family: monospace;
        margin-top: 0.5rem;
        white-space: pre-wrap;
        word-break: break-all;
      }
    `;
    this.root.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'math-demo';

    // Create form container
    const form = document.createElement('div');
    form.className = 'math-form';

    // Add operation select
    const operationLabel = document.createElement('label');
    operationLabel.textContent = 'Operation:';
    form.appendChild(operationLabel);

    const operationSelect = document.createElement('select');
    operationSelect.id = 'operation';

    // Define available operations
    [
      { value: 'factorize', label: 'Prime Factorization' },
      { value: 'isPrime', label: 'Check if Prime' },
      { value: 'coordinates', label: 'Get Prime Coordinates' },
      { value: 'nextPrime', label: 'Next Prime Number' },
      { value: 'gcd', label: 'GCD (Enter two numbers, comma separated)' },
      { value: 'lcm', label: 'LCM (Enter two numbers, comma separated)' },
      { value: 'mobius', label: 'Möbius Function' },
    ].forEach((operation) => {
      const option = document.createElement('option');
      option.value = operation.value;
      option.textContent = operation.label;
      operationSelect.appendChild(option);
    });

    operationSelect.addEventListener('change', (event) => {
      this.operation = (event.target as HTMLSelectElement).value;
    });

    form.appendChild(operationSelect);

    // Add input field
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Number:';
    form.appendChild(inputLabel);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'number-input';
    input.placeholder = 'Enter a number...';

    input.addEventListener('input', (event) => {
      this.inputValue = (event.target as HTMLInputElement).value;
    });

    form.appendChild(input);

    // Add calculate button
    const button = document.createElement('button');
    button.textContent = 'Calculate';
    button.addEventListener('click', () => this.calculate());

    form.appendChild(button);
    container.appendChild(form);

    // Create result container
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';

    const resultLabel = document.createElement('div');
    resultLabel.className = 'result-label';
    resultLabel.textContent = 'Result:';

    const result = document.createElement('div');
    result.className = 'result';
    result.id = 'result';

    resultContainer.appendChild(resultLabel);
    resultContainer.appendChild(result);

    container.appendChild(resultContainer);

    // Add everything to shadow DOM
    this.root.appendChild(container);
  }

  /**
   * Performs the selected mathematical operation
   */
  calculate(): void {
    try {
      const resultElement = this.root.getElementById('result');
      if (!resultElement) return;

      if (!this.inputValue) {
        resultElement.textContent = 'Please enter a number';
        return;
      }

      let result: string;

      if (this.operation === 'factorize') {
        // Get the prime factorization
        const factorization = numberTheory.factorize(this.inputValue);
        result = Array.from(factorization.entries())
          .map(([prime, exp]) => `${prime}${exp > 1n ? `^${exp}` : ''}`)
          .join(' × ');
      } else if (this.operation === 'isPrime') {
        // Check if the number is prime
        result = numberTheory.isPrime(this.inputValue)
          ? 'Yes, this is a prime number'
          : 'No, this is not a prime number';
      } else if (this.operation === 'coordinates') {
        // Use the utility function to get serializable coordinates
        const serializable = getSerializableCoordinates(this.inputValue);
        result = JSON.stringify(serializable);
      } else if (this.operation === 'nextPrime') {
        result = numberTheory.nextPrime(this.inputValue).toString();
      } else if (this.operation === 'gcd' || this.operation === 'lcm') {
        // Handle operations that require two numbers
        const numbers = this.inputValue.split(',').map((num) => num.trim());

        if (numbers.length !== 2) {
          result = 'Please enter two numbers separated by a comma';
        } else {
          if (this.operation === 'gcd') {
            result = numberTheory.gcd(numbers[0], numbers[1]).toString();
          } else {
            result = numberTheory.lcm(numbers[0], numbers[1]).toString();
          }
        }
      } else if (this.operation === 'mobius') {
        // Validate input
        if (!/^[1-9]\d*$/.test(this.inputValue)) {
          result = 'Invalid input: Möbius function requires a positive integer';
        } else {
          try {
            // Get the factorization
            const factorization = numberTheory.factorize(this.inputValue);

            // Implementation of the Möbius function based on prime factorization
            // μ(n) = 0 if n has a squared prime factor
            // μ(n) = 1 if n is square-free with an even number of prime factors
            // μ(n) = -1 if n is square-free with an odd number of prime factors

            // Special case for 1
            if (this.inputValue === '1') {
              result = '1 (by definition: μ(1) = 1)';
            }
            // Check if any prime factor has exponent > 1
            else if (Array.from(factorization.values()).some((exp) => exp > 1n)) {
              result = '0 (number has a squared prime factor)';
            }
            // If square-free, determine sign based on number of prime factors
            else {
              result =
                factorization.size % 2 === 0
                  ? '1 (square-free with even number of prime factors)'
                  : '-1 (square-free with odd number of prime factors)';
            }
          } catch (calculationError) {
            // Handle calculation-specific errors
            logger.error(
              'Error in Möbius calculation:',
              calculationError instanceof Error
                ? calculationError
                : new Error(String(calculationError))
            );
            result = `Error calculating Möbius function: ${calculationError instanceof Error ? calculationError.message : String(calculationError)}`;
          }
        }
      } else {
        // Get all available operations from the select element
        const operationSelect = this.root.getElementById('operation') as HTMLSelectElement;
        const availableOps = Array.from(operationSelect?.options || [])
          .map((opt) => opt.value)
          .filter(Boolean)
          .join(', ');

        // Log the error with available operations
        logger.error(
          `Invalid operation selected: ${this.operation}. Available operations: ${availableOps}`
        );

        // Display user-friendly message
        result = `Operation "${this.operation}" is not recognized. Please select a valid operation.`;
      }

      resultElement.textContent = result || '';
    } catch (error) {
      logger.error(
        'Error in calculation:',
        error instanceof Error ? error : new Error(String(error))
      );

      const resultElement = this.root.getElementById('result');
      if (resultElement) {
        resultElement.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
}

// Register the custom element
try {
  if (!customElements.get('math-demo')) {
    customElements.define('math-demo', MathDemoElement);
  }
} catch (error) {
  // If the element is already defined, this will throw an error
  // which we can safely ignore in this case
  if (error instanceof Error && !error.message.includes('already been defined')) {
    // Only log unexpected errors
    logger.error(
      'Failed to register math-demo custom element:',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
