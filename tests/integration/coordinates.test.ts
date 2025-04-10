/**
 * Integration tests for coordinates calculation functionality
 */
import { expect } from '@wdio/globals';
import { waitForWebComponentsReady } from './helpers.ts';

describe('MathDemo Coordinates Calculation', () => {
  // Test cases with expected results
  const testCases = [
    {
      input: '42',
      expected: {
        factorization: [
          [2, 1],
          [3, 1],
          [7, 1],
        ],
        isNegative: false,
      },
    },
    {
      input: '12',
      expected: {
        factorization: [
          [2, 2],
          [3, 1],
        ],
        isNegative: false,
      },
    },
    {
      input: '100',
      expected: {
        factorization: [
          [2, 2],
          [5, 2],
        ],
        isNegative: false,
      },
    },
    {
      input: '-30',
      expected: {
        factorization: [
          [2, 1],
          [3, 1],
          [5, 1],
        ],
        isNegative: true,
      },
    },
  ];

  beforeEach(async () => {
    // Navigate to the application
    await browser.url('/');

    // Wait for app to load
    await $('#app').waitForExist();
    await $('app-root').waitForExist();
    await waitForWebComponentsReady();

    // Wait for math-demo component to be rendered within app-root's shadow DOM
    await browser.waitUntil(
      async () => {
        const exists = await browser.executeAsync((done) => {
          const appRoot = document.querySelector('app-root');
          if (!appRoot || !appRoot.shadowRoot) {
            return done(false);
          }
          const mathDemo = appRoot.shadowRoot.querySelector('math-demo');
          done(!!mathDemo);
        });
        return exists;
      },
      {
        timeout: 5000,
        timeoutMsg: 'math-demo component was not found within app-root shadow DOM after 5 seconds',
        interval: 100,
      }
    );
  });

  // Test that math demo component renders correctly
  it('should render the math demo component inside app-root', async () => {
    // Check if math-demo exists within app-root's shadow DOM
    const mathDemoExists = await browser.executeAsync((done) => {
      const appRoot = document.querySelector('app-root');
      const mathDemo = appRoot?.shadowRoot?.querySelector('math-demo');
      done(!!mathDemo);
    });

    expect(mathDemoExists).toBe(true);

    // Check if the form elements exist
    const formElementsExist = await browser.executeAsync((done) => {
      const appRoot = document.querySelector('app-root');
      const mathDemo = appRoot?.shadowRoot?.querySelector('math-demo');
      if (!mathDemo || !mathDemo.shadowRoot) {
        return done(false);
      }

      const operation = mathDemo.shadowRoot.querySelector('#operation');
      const input = mathDemo.shadowRoot.querySelector('#number-input');
      const button = mathDemo.shadowRoot.querySelector('button');
      const result = mathDemo.shadowRoot.querySelector('#result');

      done({
        operation: !!operation,
        input: !!input,
        button: !!button,
        result: !!result,
      });
    });

    expect(formElementsExist).toEqual({
      operation: true,
      input: true,
      button: true,
      result: true,
    });
  });

  it('should allow selecting different operations through the shadow DOM', async () => {
    // Select the isPrime operation
    await browser.executeAsync((done) => {
      const appRoot = document.querySelector('app-root');
      const mathDemo = appRoot?.shadowRoot?.querySelector('math-demo');
      if (!mathDemo || !mathDemo.shadowRoot) {
        return done(false);
      }

      const select = mathDemo.shadowRoot.querySelector('#operation');
      if (select) {
        select.value = 'isPrime';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        done(true);
      } else {
        done(false);
      }
    });

    // Verify the operation was set
    const operationValue = await browser.executeAsync((done) => {
      const appRoot = document.querySelector('app-root');
      const mathDemo = appRoot?.shadowRoot?.querySelector('math-demo');
      if (!mathDemo || !mathDemo.shadowRoot) {
        return done(null);
      }

      const select = mathDemo.shadowRoot.querySelector('#operation');
      done(select ? select.value : null);
    });

    expect(operationValue).toBe('isPrime');
  });

  // Test coordinates calculation for each test case
  testCases.forEach(({ input, expected }) => {
    it(`should correctly calculate and display coordinates for ${input}`, async () => {
      // Execute calculation in the browser context
      const result = await browser.executeAsync((testInput, done) => {
        // Get the math demo component
        const appRoot = document.querySelector('app-root');
        const mathDemo = appRoot?.shadowRoot?.querySelector('math-demo');
        if (!mathDemo || !mathDemo.shadowRoot) {
          return done({ success: false, error: 'Component not found' });
        }

        try {
          // Select the coordinates operation
          const select = mathDemo.shadowRoot.querySelector('#operation');
          if (select) {
            select.value = 'coordinates';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Enter the test input
          const inputField = mathDemo.shadowRoot.querySelector('#number-input');
          if (inputField) {
            inputField.value = testInput;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
          }

          // Click the calculate button
          const button = mathDemo.shadowRoot.querySelector('button');
          if (button) {
            button.click();
          }

          // Use a timeout to allow the calculation to complete
          setTimeout(() => {
            const resultElement = mathDemo.shadowRoot.querySelector('#result');
            const resultText = resultElement ? resultElement.textContent : '';

            try {
              const parsedResult = resultText ? JSON.parse(resultText) : null;
              done({ success: true, result: parsedResult });
            } catch (e) {
              done({ success: false, error: 'Failed to parse result', text: resultText });
            }
          }, 200);
        } catch (e) {
          done({ success: false, error: e.message });
        }
      }, input);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      // Verify coordinates structure
      expect(result.result).toHaveProperty('factorization');
      expect(result.result).toHaveProperty('isNegative');
      expect(result.result.isNegative).toBe(expected.isNegative);

      // Sort factorization arrays for consistent comparison
      const sortedActual = [...result.result.factorization].sort((a, b) => a[0] - b[0]);
      const sortedExpected = [...expected.factorization].sort((a, b) => a[0] - b[0]);

      // Compare factorization data
      expect(sortedActual).toEqual(sortedExpected);
    });
  });
});
