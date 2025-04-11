/**
 * Home page component
 * Serves as the main landing page for the application
 */
import { BasePage } from './BasePage';
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';

export class HomePage extends BasePage {
  constructor() {
    super();
    this._title = 'Prime Math Library';
  }

  /**
   * Render the home page content
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
      const introSection = this.createSection('Welcome', 'intro');
      const introContent = introSection.querySelector('.section-content');

      if (introContent) {
        introContent.innerHTML = `
          <p>
            Welcome to the Prime Math Library Explorer, a powerful tool for exploring
            universal number coordinates and advanced mathematical operations using
            the <strong>@uor-foundation/math-js</strong> library.
          </p>
          <p>
            This application demonstrates the capabilities of the Prime Framework,
            a mathematical system that represents numbers through their prime factorization.
          </p>
        `;
      }

      container.appendChild(introSection);

      // Create features section
      const featuresSection = this.createSection('Core Features', 'features');
      const featuresContent = featuresSection.querySelector('.section-content');

      if (featuresContent) {
        // Create styled feature list
        const style = document.createElement('style');
        style.textContent = `
          .features-list {
            list-style: none;
            padding: 0;
            margin: 1rem 0;
          }
          
          .features-list li {
            margin-bottom: 0.5rem;
            position: relative;
            padding-left: 1.5rem;
          }
          
          .features-list li::before {
            content: "✓";
            color: #4CAF50;
            position: absolute;
            left: 0;
            font-weight: bold;
          }
        `;
        featuresContent.appendChild(style);

        const featuresList = document.createElement('ul');
        featuresList.className = 'features-list';

        const features = [
          'Universal Number representation based on prime factorization',
          'Comprehensive number theory operations (GCD, LCM, etc.)',
          'Exact arithmetic with guaranteed precision',
          'Base-independent number representation',
          'Advanced functions like totient calculation, Möbius function',
          'Prime number operations including primality testing',
        ];

        features.forEach((feature) => {
          const li = document.createElement('li');
          li.textContent = feature;
          featuresList.appendChild(li);
        });

        featuresContent.appendChild(featuresList);
      }

      container.appendChild(featuresSection);

      // Create demo section with link to interactive demo
      const demoSection = this.createSection('Interactive Demo', 'demo');
      const demoContent = demoSection.querySelector('.section-content');

      if (demoContent) {
        demoContent.innerHTML = `
          <p>
            Try out the capabilities of the Prime Math Library with our interactive calculator:
          </p>
          
          <div class="demo-button-container" style="text-align: center; margin: 2rem 0;">
            <button id="open-demo-button" class="primary-button">
              Open Calculator Demo
            </button>
          </div>
        `;

        // Add button styles
        const style = document.createElement('style');
        style.textContent = `
          .primary-button {
            background-color: ${THEME.colors.primary};
            color: white;
            border: none;
            border-radius: ${THEME.borderRadius.md};
            padding: ${THEME.spacing.md} ${THEME.spacing.lg};
            font-size: ${THEME.fontSizes.normal};
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          
          .primary-button:hover {
            background-color: ${THEME.colors.primaryHover};
          }
        `;
        demoContent.appendChild(style);

        // Add event listener to the button
        setTimeout(() => {
          const demoButton = this._root.getElementById('open-demo-button');
          if (demoButton) {
            demoButton.addEventListener('click', () => {
              // Dispatch navigation event
              this.dispatchEvent(
                new CustomEvent('navigate', {
                  detail: { page: 'calculator' },
                  bubbles: true,
                  composed: true,
                })
              );
            });
          }
        }, 0);
      }

      container.appendChild(demoSection);

      // Create about section with framework explanation
      const aboutSection = this.createSection('About the Prime Framework', 'about');
      const aboutContent = aboutSection.querySelector('.section-content');

      if (aboutContent) {
        aboutContent.innerHTML = `
          <p>
            The Prime Framework is a mathematical system that represents numbers through 
            their prime factorization. Instead of representing numbers in a specific base 
            (like decimal or binary), the Prime Framework uses the fundamental building 
            blocks of integers: prime numbers.
          </p>
          
          <h3>Key Advantages</h3>
          <ul>
            <li>Numbers are stored in their unique canonical form</li>
            <li>Arithmetic operations can be performed with exact precision</li>
            <li>The representation is base-independent</li>
            <li>It provides direct access to number-theoretic properties</li>
          </ul>
          
          <h3>Mathematical Foundation</h3>
          <p>
            The Fundamental Theorem of Arithmetic states that every integer greater 
            than 1 can be represented uniquely as a product of prime numbers. This 
            theorem forms the basis of the Prime Framework's approach to number representation.
          </p>
        `;
      }

      container.appendChild(aboutSection);
    } catch (error) {
      logger.error(
        'Error rendering HomePage:',
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
    logger.info('Home page activated');
    // Additional activation logic can be added here
  }
}

// Register the custom element
try {
  if (!customElements.get('home-page')) {
    customElements.define('home-page', HomePage);
  }
} catch (error) {
  logger.error(
    'Failed to register home-page component:',
    error instanceof Error ? error : new Error(String(error))
  );
}
