/**
 * Calculator page component
 * Provides the math calculator functionality
 */
import { BasePage } from './BasePage';
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';
import '../components/MathDemo';

export class CalculatorPage extends BasePage {
  constructor() {
    super();
    this._title = 'Math Calculator';
  }

  /**
   * Render the calculator page content
   */
  protected render(): void {
    try {
      // First call the parent's render method to set up the container
      super.render();

      // Get the container
      const container = this._root.querySelector('.page-container');
      if (!container) {
        throw new Error('Container element not found in shadow DOM');
      }

      // Create intro section
      const introSection = this.createSection('Universal Number Calculator', 'calculator-intro');
      const introContent = introSection.querySelector('.section-content');

      if (introContent) {
        introContent.innerHTML = `
          <p>
            Use the calculator below to perform various mathematical operations using
            the Prime Framework's universal number representation.
          </p>
        `;
      }

      container.appendChild(introSection);

      // Create calculator section
      const calculatorSection = this.createSection('Interactive Calculator', 'calculator');
      const calculatorContent = calculatorSection.querySelector('.section-content');

      if (calculatorContent) {
        // Add styles specifically for the calculator embedding
        const style = document.createElement('style');
        style.textContent = `
          .calculator-container {
            background-color: ${THEME.colors.background.main};
            border-radius: ${THEME.borderRadius.lg};
            padding: ${THEME.spacing.lg};
            margin: ${THEME.spacing.md} 0;
          }
          
          math-demo {
            display: block;
            margin: 0 auto;
            max-width: 600px;
          }
        `;
        calculatorContent.appendChild(style);

        // Create container for math demo
        const demoContainer = document.createElement('div');
        demoContainer.className = 'calculator-container';

        // Add math demo component
        const mathDemo = document.createElement('math-demo');
        demoContainer.appendChild(mathDemo);
        calculatorContent.appendChild(demoContainer);
      }

      container.appendChild(calculatorSection);

      // Create operations guide section
      const guideSection = this.createSection('Operations Guide', 'operations-guide');
      const guideContent = guideSection.querySelector('.section-content');

      if (guideContent) {
        guideContent.innerHTML = `
          <p>
            The calculator supports the following operations:
          </p>
          
          <h3>Prime Factorization</h3>
          <p>
            Decomposes a number into its prime factors. For example, 60 = 2² × 3 × 5.
          </p>
          
          <h3>Primality Test</h3>
          <p>
            Checks if a number is prime. A prime number is only divisible by 1 and itself.
          </p>
          
          <h3>Prime Coordinates</h3>
          <p>
            Displays the number as coordinates in the prime number space, showing its
            unique prime factorization representation.
          </p>
          
          <h3>Next Prime</h3>
          <p>
            Finds the next prime number greater than the input.
          </p>
          
          <h3>GCD (Greatest Common Divisor)</h3>
          <p>
            Finds the largest positive integer that divides each of the input numbers
            without a remainder. Enter two numbers separated by a comma.
          </p>
          
          <h3>LCM (Least Common Multiple)</h3>
          <p>
            Finds the smallest positive integer that is divisible by both input numbers.
            Enter two numbers separated by a comma.
          </p>
          
          <h3>Möbius Function</h3>
          <p>
            Calculates the Möbius function value for the input number. The Möbius function
            is an important number-theoretic function with applications in combinatorics.
          </p>
        `;
      }

      container.appendChild(guideSection);
    } catch (error) {
      logger.error(
        'Error rendering CalculatorPage:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Show error fallback
      this.renderErrorFallback(error);
    }
  }

  /**
   * Called when the page becomes active
   */
  protected onActivate(): void {
    logger.info('Calculator page activated');
  }
}

// Register the custom element
try {
  if (!customElements.get('calculator-page')) {
    customElements.define('calculator-page', CalculatorPage);
  }
} catch (error) {
  logger.error(
    'Failed to register calculator-page component:',
    error instanceof Error ? error : new Error(String(error))
  );
}
