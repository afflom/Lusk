// Import the Counter web component
import './Counter';
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
        
        .capabilities-section ol {
          text-align: left;
          margin-left: 1rem;
          line-height: 1.8;
        }
        
        .capabilities-section li {
          margin-bottom: 0.8rem;
        }
        
        code {
          font-family: 'Courier New', monospace;
          background-color: #333;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
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
      if (this.shadowRoot) {
        const counter = this.shadowRoot.querySelector('app-counter');
        if (counter) {
          counter.removeEventListener('counter-changed', () => {});
          counter.removeEventListener('error', () => {});
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
        'A modern, lightweight <strong>TypeScript Progressive Web App template</strong> with Web Components and GitHub Pages deployment.';
      intro.appendChild(introText);
      container.appendChild(intro);

      // Features section
      const features = document.createElement('div');
      features.className = 'features-container';

      const featuresTitle = document.createElement('h2');
      featuresTitle.textContent = 'Features';
      features.appendChild(featuresTitle);

      const featuresList = document.createElement('ul');
      featuresList.className = 'features-list';

      const featureItems = [
        'TypeScript with strict type checking',
        'Custom Web Components without frameworks',
        'Vite for fast development and optimized builds',
        'Progressive Web App (PWA) support with offline capabilities',
        'GitHub Pages deployment through GitHub Actions',
        'Comprehensive testing with Vitest',
        'Modern ESLint and Prettier configuration',
        'DevContainer and GitHub Codespaces ready',
      ];

      featureItems.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        featuresList.appendChild(li);
      });

      features.appendChild(featuresList);
      container.appendChild(features);

      // Example component with counter
      const demoSection = document.createElement('div');
      demoSection.className = 'demo-section';

      const demoTitle = document.createElement('h2');
      demoTitle.textContent = 'Interactive Demo';
      demoSection.appendChild(demoTitle);

      const demoDescription = document.createElement('p');
      demoDescription.textContent =
        'This counter demonstrates the interactive functionality you can build with this template:';
      demoSection.appendChild(demoDescription);

      try {
        // Create a counter component - wrapped in try/catch to handle potential errors
        const counter = document.createElement('app-counter');
        counter.setAttribute('label', 'Counter');
        counter.setAttribute('count', '0');

        // Add an error handler to catch custom element connection errors
        const errorHandler = (event: Event): void => {
          logger.error(`Counter component error: ${event.type}`);
        };
        counter.addEventListener('error', errorHandler);

        demoSection.appendChild(counter);
      } catch (counterError) {
        logger.error(
          'Error creating counter component:',
          counterError instanceof Error ? counterError : new Error(String(counterError))
        );

        // Fallback to a plain button if the custom element fails
        const fallbackButton = document.createElement('button');
        fallbackButton.textContent = 'Counter (Component Failed)';
        fallbackButton.style.padding = '8px 16px';
        fallbackButton.style.background = '#646cff';
        fallbackButton.style.color = 'white';
        fallbackButton.style.border = 'none';
        fallbackButton.style.borderRadius = '4px';

        demoSection.appendChild(fallbackButton);
      }

      container.appendChild(demoSection);

      // Key Capabilities section
      const capabilities = document.createElement('div');
      capabilities.className = 'capabilities-section';

      const capabilitiesTitle = document.createElement('h2');
      capabilitiesTitle.textContent = 'Key Capabilities';
      capabilities.appendChild(capabilitiesTitle);

      const capabilitiesList = document.createElement('ol');

      const capabilityItems = [
        'Offline support with Service Worker caching',
        'TypeScript for robust, type-safe code',
        'Web Components for modular UI architecture',
        'Fast builds and hot module replacement',
        'Modern tooling with ESLint and Prettier',
        'Comprehensive test infrastructure',
        'Continuous integration and deployment',
      ];

      capabilityItems.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = item;
        capabilitiesList.appendChild(li);
      });

      capabilities.appendChild(capabilitiesList);
      container.appendChild(capabilities);

      // Create footer
      const footer = document.createElement('footer');
      footer.className = 'footer';

      const footerText = document.createElement('p');
      footerText.innerHTML = 'Built with TypeScript Progressive Web App architecture';
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
