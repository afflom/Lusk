// Import the Counter web component
import './Counter';
// Import MathDemo web component
import './MathDemo';
import * as logger from '../utils/logger';
import { appConfig } from '../utils/config';

/**
 * App Web Component - Main application container
 */
export class AppElement extends HTMLElement {
  private _title: string = appConfig.defaultTitle; // Use _ to avoid conflicts with HTMLElement properties
  private initialized = false;

  // Observed attributes
  static get observedAttributes(): string[] {
    return ['title'];
  }

  constructor() {
    super();

    try {
      // Create shadow DOM for encapsulation
      const shadow = this.attachShadow({ mode: 'open' });

      // Get the title from attribute or use default from config
      this._title = this.getAttribute('title') || appConfig.defaultTitle;

      // Create styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.87);
          background-color: #242424;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        h1 {
          font-size: 2.5em;
          line-height: 1.1;
          text-align: center;
          margin-bottom: 1rem;
          color: #646cff;
        }
        
        h2 {
          font-size: 1.8em;
          color: #8f94fb;
          margin-top: 2rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #444;
          padding-bottom: 0.5rem;
        }
        
        h3 {
          font-size: 1.4em;
          color: #a5acff;
          margin-top: 1.5rem;
          margin-bottom: 0.8rem;
        }
        
        .intro {
          margin: 2rem 0;
          text-align: center;
          font-size: 1.2em;
        }
        
        .features-container {
          margin: 2rem 0;
        }
        
        .features-list {
          text-align: left;
          margin-left: 1rem;
          line-height: 1.8;
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
        
        .demo-section {
          background-color: #2a2a2a;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
          text-align: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .capabilities-section {
          margin: 2rem 0;
        }
        
        .explanation {
          margin: 1rem 0;
          background-color: #2a2a2a;
          padding: 1rem;
          border-radius: 8px;
          line-height: 1.6;
        }
        
        code {
          font-family: 'Courier New', monospace;
          background-color: #333;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        
        pre {
          background-color: #333;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .code-block {
          display: block;
          margin: 1rem 0;
          padding: 1rem;
          background-color: #333;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          white-space: pre;
        }
        
        .footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #444;
          text-align: center;
          font-style: italic;
          color: #888;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          :host {
            padding: 1rem;
          }
          
          h1 {
            font-size: 2em;
          }
          
          h2 {
            font-size: 1.5em;
          }
          
          .code-block {
            font-size: 0.8em;
          }
        }
      `;

      // Add style to shadow root
      shadow.appendChild(style);
    } catch (error) {
      logger.error(
        'Error in AppElement constructor:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error constructing app component' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  // Lifecycle: when element is added to DOM
  connectedCallback(): void {
    try {
      // Ensure component is fully rendered if not already
      if (this.shadowRoot && !this.initialized) {
        this.render();
        this.initialized = true;
      }
    } catch (error) {
      logger.error(
        'Error in AppElement connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error initializing app component' },
          bubbles: true,
          composed: true,
        })
      );

      // Attempt recovery by showing minimal content
      if (this.shadowRoot) {
        const errorMsg = document.createElement('div');
        errorMsg.innerHTML = `<h1>App Error</h1><p>Error rendering app. See console for details.</p>`;
        this.shadowRoot.appendChild(errorMsg);
      }
    }
  }

  // Lifecycle: when element is removed from DOM
  disconnectedCallback(): void {
    // Clean up any event listeners or resources
    try {
      // Remove event listeners from any components we might have created
      if (this.shadowRoot) {
        const mathDemo = this.shadowRoot.querySelector('math-demo');
        if (mathDemo) {
          // Remove any potential listeners we might have added in the future
          // Currently there are none, but this ensures we have proper cleanup
          const mathDemoButtons = mathDemo.shadowRoot?.querySelectorAll('button');
          mathDemoButtons?.forEach((button) => {
            button.removeEventListener('click', () => {});
          });
        }
      }
    } catch (error) {
      logger.error(
        'Error in AppElement disconnectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Lifecycle: when element is moved to a new document
  adoptedCallback(): void {
    // Handle any updates necessary when the element is moved to a new document
    try {
      if (this.shadowRoot) {
        this.render();
      }
    } catch (error) {
      logger.error(
        'Error in AppElement adoptedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Lifecycle: when attributes change
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    try {
      if (name === 'title' && oldValue !== newValue) {
        this._title = newValue || appConfig.defaultTitle;

        // Update title if already rendered
        if (this.shadowRoot) {
          const titleElement = this.shadowRoot.querySelector('h1');
          if (titleElement) {
            titleElement.textContent = this._title;
          }
        }
      }
    } catch (error) {
      logger.error(
        'Error in AppElement attributeChangedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, attribute: name },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Render the app content
   */
  private render(): void {
    try {
      // Create app container
      const container = document.createElement('div');

      // Create title
      const titleElement = document.createElement('h1');
      titleElement.textContent = this._title;
      container.appendChild(titleElement);

      // Create intro section
      const intro = document.createElement('div');
      intro.className = 'intro';

      const introText = document.createElement('p');
      introText.innerHTML =
        'Explore the <strong>@uor-foundation/math-js</strong> library, a JavaScript implementation of the Prime Framework for universal number representation.';
      intro.appendChild(introText);
      container.appendChild(intro);

      // What is the Prime Framework section
      const whatIs = document.createElement('div');
      const whatIsTitle = document.createElement('h2');
      whatIsTitle.textContent = 'What is the Prime Framework?';
      whatIs.appendChild(whatIsTitle);

      const whatIsText = document.createElement('div');
      whatIsText.className = 'explanation';
      whatIsText.innerHTML = `
        <p>The Prime Framework is a mathematical system that represents numbers through their prime factorization. Instead of representing numbers in a specific base (like decimal or binary), the Prime Framework uses the fundamental building blocks of integers: prime numbers.</p>
        <p>This representation has several advantages:</p>
        <ul>
          <li>Numbers are stored in their unique canonical form</li>
          <li>Arithmetic operations can be performed with exact precision</li>
          <li>The representation is base-independent</li>
          <li>It provides direct access to number-theoretic properties</li>
        </ul>
      `;
      whatIs.appendChild(whatIsText);
      container.appendChild(whatIs);

      // Features section
      const features = document.createElement('div');
      features.className = 'features-container';

      const featuresTitle = document.createElement('h2');
      featuresTitle.textContent = 'Core Features';
      features.appendChild(featuresTitle);

      const featuresList = document.createElement('ul');
      featuresList.className = 'features-list';

      const featureItems = [
        'Universal Number representation based on prime factorization',
        'Comprehensive number theory operations (GCD, LCM, etc.)',
        'Exact arithmetic with guaranteed precision',
        'Base-independent number representation',
        'Advanced functions like totient calculation, Möbius function',
        'Prime number operations including primality testing',
      ];

      featureItems.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        featuresList.appendChild(li);
      });

      features.appendChild(featuresList);
      container.appendChild(features);

      // Code Example
      const codeSection = document.createElement('div');
      const codeTitle = document.createElement('h2');
      codeTitle.textContent = 'Basic Usage Example';
      codeSection.appendChild(codeTitle);

      const codeBlock = document.createElement('pre');
      codeBlock.className = 'code-block';
      codeBlock.textContent = `
// Import the library using ES modules
import { UniversalNumber, numberTheory } from '@uor-foundation/math-js';

// Create universal numbers
const a = UniversalNumber.fromString("42");
const b = UniversalNumber.fromString("123456789");

// Perform arithmetic operations
const sum = a.add(b);
const product = a.multiply(b);

// Get the prime factorization
const coordinates = a.getCoordinates();
console.log(coordinates.factorization); // Map of prime-exponent pairs

// Check if a number is prime
const isPrime = numberTheory.isPrime("123456789");

// Get the factorization
const factors = numberTheory.factorize("42");

// Convert back to standard formats
const bigIntValue = sum.toBigInt();
const decimalString = product.toString();
      `;
      codeSection.appendChild(codeBlock);
      container.appendChild(codeSection);

      // Interactive Demo
      const demoSection = document.createElement('div');
      demoSection.className = 'demo-section';

      const demoTitle = document.createElement('h2');
      demoTitle.textContent = 'Interactive Math-JS Demo';
      demoSection.appendChild(demoTitle);

      const demoDescription = document.createElement('p');
      demoDescription.textContent = 'Try out some of the Prime Math Library features:';
      demoSection.appendChild(demoDescription);

      try {
        // Create a math demo component
        const mathDemo = document.createElement('math-demo');
        demoSection.appendChild(mathDemo);
      } catch (error) {
        logger.error(
          'Error creating math demo component:',
          error instanceof Error ? error : new Error(String(error))
        );

        const errorMsg = document.createElement('p');
        errorMsg.textContent = `Error creating math demo: ${error instanceof Error ? error.message : String(error)}`;
        demoSection.appendChild(errorMsg);
      }

      container.appendChild(demoSection);

      // Number Theory Section
      const numberTheorySection = document.createElement('div');
      const numberTheoryTitle = document.createElement('h2');
      numberTheoryTitle.textContent = 'Number Theory Operations';
      numberTheorySection.appendChild(numberTheoryTitle);

      const numberTheoryText = document.createElement('div');
      numberTheoryText.className = 'explanation';
      numberTheoryText.innerHTML = `
        <h3>Prime Factorization</h3>
        <p>Every integer greater than 1 can be expressed as a unique product of prime numbers. The Prime Framework uses this fundamental property to represent numbers.</p>
        <p>For example, 60 = 2² × 3 × 5</p>
        
        <h3>Greatest Common Divisor (GCD)</h3>
        <p>The GCD of two or more integers is the largest positive integer that divides each of them without a remainder.</p>
        <p>The Prime Framework can efficiently calculate GCD by comparing prime factors.</p>
        
        <h3>Least Common Multiple (LCM)</h3>
        <p>The LCM of two integers is the smallest positive integer that is divisible by both.</p>
        <p>In the Prime Framework, LCM is calculated using the prime factorizations.</p>
        
        <h3>Totient Function</h3>
        <p>Euler's totient function counts the positive integers up to a given integer n that are relatively prime to n.</p>
        <p>In the Prime Framework, this is calculated directly from the prime factorization.</p>
      `;
      numberTheorySection.appendChild(numberTheoryText);
      container.appendChild(numberTheorySection);

      // Create footer
      const footer = document.createElement('footer');
      footer.className = 'footer';

      const footerText = document.createElement('p');
      footerText.innerHTML =
        'Explore the power of the Prime Framework with @uor-foundation/math-js';
      footer.appendChild(footerText);

      container.appendChild(footer);

      // Add to shadow root (clear existing content first)
      const shadowRoot = this.shadowRoot;
      if (shadowRoot) {
        // Remove any existing content container to avoid duplication
        // Keep only the first child which is the style element
        while (shadowRoot.childNodes.length > 1) {
          shadowRoot.removeChild(shadowRoot.lastChild as Node);
        }

        // Append the new container
        shadowRoot.appendChild(container);
      }
    } catch (renderError) {
      logger.error(
        'Fatal error in render():',
        renderError instanceof Error ? renderError : new Error(String(renderError))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error: renderError, message: 'Fatal error rendering app component' },
          bubbles: true,
          composed: true,
        })
      );

      // Attempt to show a minimal error message
      if (this.shadowRoot) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
          <style>
            .error-container {
              font-family: sans-serif;
              color: #ff3e3e;
              padding: 20px;
              border: 1px solid #ff3e3e;
              border-radius: 4px;
              margin: 20px;
              background-color: #fff1f1;
            }
          </style>
          <div class="error-container">
            <h2>App Rendering Error</h2>
            <p>There was an error rendering the application:</p>
            <pre>${renderError instanceof Error ? renderError.message : String(renderError)}</pre>
            <p>Please check the console for more details.</p>
          </div>
        `;

        // Clear shadow DOM first
        while (this.shadowRoot.childNodes.length > 0) {
          this.shadowRoot.removeChild(this.shadowRoot.childNodes[0]);
        }

        this.shadowRoot.appendChild(errorDiv);
      }
    }
  }
}

// Use try-catch to ensure robustness in different environments
try {
  // Define the custom element if not already defined
  if (!customElements.get('app-root')) {
    customElements.define('app-root', AppElement);
  }
} catch (error) {
  logger.error(
    'Failed to register app-root custom element:',
    error instanceof Error ? error : new Error(String(error))
  );

  // This would only happen in test environments
  if (process.env.NODE_ENV === 'test') {
    logger.warn('Failed to register app-root custom element in test environment.');
  }
}

/**
 * Create and initialize the app
 * @param rootSelector - Selector for container element to append app to
 * @param title - Optional custom title
 * @returns The created app element
 */
export function createApp(rootSelector: string = '#app', title?: string): AppElement {
  const rootElement = document.querySelector(rootSelector);
  if (!rootElement) {
    const error = new Error(`Root element not found: ${rootSelector}`);
    logger.error('Error creating app component:', error);
    throw error;
  }

  // Create app element
  const app = document.createElement('app-root') as AppElement;
  if (title) {
    app.setAttribute('title', title);
  }

  // Append to root
  rootElement.appendChild(app);
  return app;
}
