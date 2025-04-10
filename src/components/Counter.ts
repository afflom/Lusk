import * as logger from '../utils/logger';

/**
 * Counter Web Component
 *
 * A custom element that displays a button with a counter
 * that increments when clicked.
 */
export class CounterElement extends HTMLElement {
  private counter: number = 0;
  private button: HTMLButtonElement | null = null;

  // Observed attributes for reactive updates
  static get observedAttributes(): string[] {
    return ['count', 'label'];
  }

  constructor() {
    super();

    try {
      // Create shadow DOM for encapsulation
      const shadow = this.attachShadow({ mode: 'open' });

      // Create styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: inline-block;
          margin: 1rem 0;
        }
        
        button {
          padding: 0.8em 1.6em;
          font-size: 1.1em;
          font-weight: 500;
          font-family: inherit;
          background-color: #646cff;
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
          border-radius: 8px;
          border: 1px solid transparent;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        button:hover {
          background-color: #7c82ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        button:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        button:focus,
        button:focus-visible {
          outline: 3px solid rgba(100, 108, 255, 0.5);
          outline-offset: 2px;
        }
      `;

      // Create button element
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.addEventListener('click', this.incrementHandler.bind(this));

      // Add elements to shadow DOM
      shadow.appendChild(style);
      shadow.appendChild(this.button);

      // Get initial count from attribute
      const initialCount = this.getInitialCount();
      this.counter = initialCount;
    } catch (error) {
      logger.error(
        'Error in CounterElement constructor:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error constructing counter component' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  // Handler function for click events to avoid issues with bind/unbind
  private incrementHandler(): void {
    this.increment();
  }

  // Lifecycle: when element is added to DOM
  connectedCallback(): void {
    try {
      // Set initial counter display
      this.updateDisplay();
    } catch (error) {
      logger.error(
        'Error in CounterElement connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error initializing counter component' },
          bubbles: true,
          composed: true,
        })
      );

      // Try to recover by showing fallback content
      if (this.shadowRoot) {
        const fallback = document.createElement('div');
        fallback.textContent = 'Error loading counter';
        fallback.style.color = 'red';
        this.shadowRoot.appendChild(fallback);
      }
    }
  }

  // Lifecycle: when element is removed from DOM
  disconnectedCallback(): void {
    // Clean up any event listeners or resources
    if (this.button) {
      this.button.removeEventListener('click', this.incrementHandler);
    }
  }

  // Lifecycle: when element is moved to a new document
  adoptedCallback(): void {
    // Update display when moved to a new document
    this.updateDisplay();
  }

  // Lifecycle: when attributes change
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    try {
      if (name === 'count' && oldValue !== newValue && newValue !== null) {
        this.counter = parseInt(newValue, 10) || 0;
        this.updateDisplay();
      } else if (name === 'label' && oldValue !== newValue) {
        this.updateDisplay();
      }
    } catch (error) {
      logger.error(
        'Error in CounterElement attributeChangedCallback:',
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

  // Get the initial count from attributes or default to 0
  private getInitialCount(): number {
    const countAttr = this.getAttribute('count');
    return countAttr ? parseInt(countAttr, 10) : 0;
  }

  /**
   * Increment counter
   */
  increment(): void {
    try {
      const newValue = this.counter + 1;
      this.counter = newValue;

      // Update attribute to reflect new state
      this.setAttribute('count', String(newValue));

      // Update display
      this.updateDisplay();

      // Dispatch custom event when counter changes
      this.dispatchEvent(
        new CustomEvent('counter-changed', {
          detail: { value: this.counter },
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      logger.error(
        'Error incrementing counter:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error incrementing counter' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Update element display with current counter value
   */
  private updateDisplay(): void {
    try {
      const label = this.getAttribute('label') || 'Count';

      // Make sure button exists before updating it
      if (!this.button) {
        logger.error('Button element not found in counter component');
        return;
      }

      this.button.textContent = `${label}: ${this.counter}`;
    } catch (error) {
      logger.error(
        'Error updating counter display:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error updating counter display' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Get current counter value
   * @returns Current counter value
   */
  getValue(): number {
    return this.counter;
  }
}

// Use try-catch to ensure robustness in different environments
try {
  // Define the custom element if not already defined
  if (!customElements.get('app-counter')) {
    customElements.define('app-counter', CounterElement);
  }
} catch (error) {
  logger.error(
    'Failed to register app-counter custom element:',
    error instanceof Error ? error : new Error(String(error))
  );

  // This would only happen in test environments
  if (process.env.NODE_ENV === 'test') {
    logger.warn('Failed to register app-counter custom element in test environment.');
  }
}

/**
 * Helper function to add a counter to the page
 * @param parentSelector - Parent element selector to append counter to
 * @param initialCount - Initial counter value
 * @param label - Optional label for the counter
 * @returns The created counter element
 */
export function createCounter(
  parentSelector: string,
  initialCount: number = 0,
  label: string = 'The counter value is'
): CounterElement {
  const parent = document.querySelector(parentSelector);
  if (!parent) {
    const error = new Error(`Parent element not found: ${parentSelector}`);
    logger.error('Error creating counter component:', error);
    throw error;
  }

  const counter = document.createElement('app-counter') as CounterElement;
  counter.setAttribute('count', String(initialCount));
  counter.setAttribute('label', label);

  parent.appendChild(counter);
  return counter;
}
