/**
 * Web Component Testing Utilities
 *
 * This file provides helper functions and classes to test web components
 * in a JSDOM environment with proper mocking.
 */

import { vi } from 'vitest';
// We explicitly use MockedMathDemoElement in the interface for type safety,
// even though TypeScript doesn't recognize its usage in the return type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MockedCounterElement, MockedAppElement, MockedMathDemoElement } from './types';
import { appConfig } from '../utils/config';

/**
 * Helper function to create a properly mocked CounterElement
 * @returns A fully mocked CounterElement instance
 */
export function createMockCounterElement(): MockedCounterElement {
  // Create the element
  const counter = document.createElement('app-counter');

  // Add internal state
  let count = 0;
  let label = 'Count';

  // Create a button inside shadowRoot
  const button = document.createElement('button');
  button.textContent = `${label}: ${count}`;

  // Create a shadowRoot if it doesn't exist
  if (!counter.shadowRoot) {
    Object.defineProperty(counter, 'shadowRoot', {
      value: new MockShadowRoot(),
      writable: true,
    });
  }

  // Append button to shadow root
  counter.shadowRoot?.appendChild(button);

  // Add required methods
  const getValue = vi.fn(() => count);
  const increment = vi.fn(() => {
    count += 1;
    counter.setAttribute('count', String(count));
    updateDisplay();

    // Dispatch custom event
    counter.dispatchEvent(
      new CustomEvent('counter-changed', {
        detail: { value: count },
        bubbles: true,
        composed: true,
      })
    );
  });

  const updateDisplay = vi.fn(() => {
    if (counter.shadowRoot) {
      const button = counter.shadowRoot.querySelector('button') as HTMLButtonElement;
      if (button) {
        button.textContent = `${label}: ${count}`;
      }
    }
  });

  const connectedCallback = vi.fn(() => {
    updateDisplay();
  });

  const disconnectedCallback = vi.fn(() => {
    // Cleanup event listeners
    const button = counter.shadowRoot?.querySelector('button');
    if (button) {
      button.removeEventListener('click', increment);
    }
  });

  const attributeChangedCallback = vi.fn(
    (name: string, oldValue: string | null, newValue: string) => {
      if (name === 'count' && oldValue !== newValue) {
        count = parseInt(newValue, 10) || 0;
        updateDisplay();
      } else if (name === 'label' && oldValue !== newValue) {
        label = newValue || 'Count';
        updateDisplay();
      }
    }
  );

  // Add methods to element
  Object.defineProperty(counter, 'getValue', {
    value: getValue,
    writable: true,
  });

  Object.defineProperty(counter, 'increment', {
    value: increment,
    writable: true,
  });

  Object.defineProperty(counter, 'updateDisplay', {
    value: updateDisplay,
    writable: true,
  });

  Object.defineProperty(counter, 'connectedCallback', {
    value: connectedCallback,
    writable: true,
  });

  Object.defineProperty(counter, 'disconnectedCallback', {
    value: disconnectedCallback,
    writable: true,
  });

  Object.defineProperty(counter, 'attributeChangedCallback', {
    value: attributeChangedCallback,
    writable: true,
  });

  return counter as unknown as MockedCounterElement;
}

/**
 * Helper function to create a properly mocked MathDemoElement
 * Exposes the internal properties for better testing
 * @returns A fully mocked MathDemoElement instance
 */
export function createMockMathDemoElement(): MockedMathDemoElement {
  // Create the element
  const mathDemo = document.createElement('math-demo');

  // Create a shadowRoot if it doesn't exist
  if (!mathDemo.shadowRoot) {
    Object.defineProperty(mathDemo, 'shadowRoot', {
      value: new MockShadowRoot(),
      writable: true,
    });
  }

  // Create form elements
  const form = document.createElement('div');
  form.className = 'math-form';

  // Create select
  const select = document.createElement('select');
  select.id = 'operation';

  // Add operation options
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
    select.appendChild(option);
  });

  // Create input
  const input = document.createElement('input');
  input.id = 'number-input';
  input.type = 'text';

  // Create button
  const button = document.createElement('button');
  button.textContent = 'Calculate';

  // Create result container
  const resultContainer = document.createElement('div');
  resultContainer.className = 'result-container';

  const resultLabel = document.createElement('div');
  resultLabel.className = 'result-label';
  resultLabel.textContent = 'Result:';

  const resultBox = document.createElement('div');
  resultBox.id = 'result';
  resultBox.className = 'result';
  resultBox.textContent = '';

  resultContainer.appendChild(resultLabel);
  resultContainer.appendChild(resultBox);

  // Add elements to form
  form.appendChild(select);
  form.appendChild(input);
  form.appendChild(button);

  // Add form and result container to shadow root
  mathDemo.shadowRoot.appendChild(form);
  mathDemo.shadowRoot.appendChild(resultContainer);

  // Add event listener to the button - similar to the real component
  button.addEventListener('click', () => {
    if (typeof mathDemo.calculate === 'function') {
      mathDemo.calculate();
    }
  });

  // Hook into the component's properties for testing
  Object.defineProperties(mathDemo, {
    inputValue: {
      get() {
        return this._inputValue || '';
      },
      set(value) {
        this._inputValue = value;
      },
    },
    operation: {
      get() {
        return this._operation || 'factorize';
      },
      set(value) {
        this._operation = value;
      },
    },
    root: {
      get() {
        return this.shadowRoot;
      },
    },
    _inputValue: { value: '', writable: true },
    _operation: { value: 'factorize', writable: true },
  });

  // Add a mock calculate method for testing with more realistic results
  const calculate = vi.fn(function () {
    const resultElement = this.shadowRoot?.getElementById('result');

    // Handle empty input validation
    if (resultElement && !this.inputValue) {
      resultElement.textContent = 'Please enter a number';
      return;
    }

    if (resultElement && this.inputValue) {
      // Perform mock calculations based on operation type
      switch (this.operation) {
        case 'factorize':
          resultElement.textContent = JSON.stringify({
            factors: [
              [2, 1],
              [3, 1],
            ],
          });
          break;

        case 'isPrime':
          resultElement.textContent = JSON.stringify({
            isPrime:
              this.inputValue === '7' || this.inputValue === '17' || this.inputValue === '23',
          });
          break;

        case 'coordinates':
          resultElement.textContent = JSON.stringify({
            factorization: [
              [2, 1],
              [3, 1],
            ],
            isNegative: this.inputValue.startsWith('-'),
          });
          break;

        case 'nextPrime':
          resultElement.textContent = JSON.stringify({
            nextPrime: '7',
          });
          break;

        case 'gcd':
          if (!this.inputValue.includes(',')) {
            resultElement.textContent = JSON.stringify({
              error: 'Please enter two comma-separated numbers',
            });
          } else {
            resultElement.textContent = JSON.stringify({
              gcd: '6',
            });
          }
          break;

        case 'lcm':
          if (!this.inputValue.includes(',')) {
            resultElement.textContent = JSON.stringify({
              error: 'Please enter two comma-separated numbers',
            });
          } else {
            resultElement.textContent = JSON.stringify({
              lcm: '12',
            });
          }
          break;

        case 'mobius':
          if (this.inputValue === '1') {
            resultElement.textContent = JSON.stringify({
              mobius: 1,
            });
          } else if (this.inputValue.startsWith('-')) {
            resultElement.textContent = JSON.stringify({
              error: 'Möbius function requires a positive integer',
            });
          } else {
            resultElement.textContent = JSON.stringify({
              mobius: this.inputValue === '6' ? -1 : 0,
            });
          }
          break;

        default:
          resultElement.textContent = JSON.stringify({
            error: `Unknown operation: ${this.operation}`,
          });
      }
    }
  });

  // Assign the calculate method
  Object.defineProperty(mathDemo, 'calculate', {
    value: calculate,
    writable: true,
  });

  return mathDemo as unknown as MockedMathDemoElement;
}

export function createMockAppElement(): MockedAppElement {
  // Create the element
  const app = document.createElement('app-root');

  // Add internal state with app title from config
  let title = app.getAttribute('title') || appConfig.defaultTitle;

  // Add custom tag name property to help tests that check against tagName
  Object.defineProperty(app, '_customTagName', {
    value: 'app-root',
    writable: false,
  });

  // Create a shadowRoot if it doesn't exist
  if (!app.shadowRoot) {
    Object.defineProperty(app, 'shadowRoot', {
      value: new MockShadowRoot(),
      writable: true,
    });
  }

  // Define methods
  const render = vi.fn(() => {
    if (app.shadowRoot) {
      // Clear shadow root
      while (app.shadowRoot.childNodes.length > 0) {
        app.shadowRoot.removeChild(app.shadowRoot.childNodes[0]);
      }

      // Create title
      const titleElement = document.createElement('h1');
      titleElement.textContent = title || 'Prime Math Library Explorer';
      app.shadowRoot.appendChild(titleElement);

      // Create math demo
      const mathDemo = document.createElement('math-demo');
      app.shadowRoot.appendChild(mathDemo);

      // Create a simple explanation paragraph
      const description = document.createElement('p');
      description.className = 'read-the-docs';
      description.textContent = 'Try the math operations above';
      app.shadowRoot.appendChild(description);
    }
  });

  const connectedCallback = vi.fn(() => {
    try {
      render();
    } catch (error) {
      console.error('Error in connectedCallback:', error);
    }
  });

  const disconnectedCallback = vi.fn(() => {
    // Cleanup resources and event listeners
    if (app.shadowRoot) {
      // Remove any event listeners from child components
      const counter = app.shadowRoot.querySelector('app-counter');
      if (counter) {
        counter.removeEventListener('counter-changed', () => {});
        counter.removeEventListener('error', () => {});
      }
    }
  });

  const adoptedCallback = vi.fn(() => {
    // Respond to the element being moved to a new document
    render(); // Re-render in new document context
  });

  const attributeChangedCallback = vi.fn(
    (name: string, oldValue: string | null, newValue: string) => {
      if (name === 'title' && oldValue !== newValue) {
        title = newValue || 'Prime Math Library Explorer';
        render();
      }
    }
  );

  // Add methods to element
  Object.defineProperty(app, 'render', {
    value: render,
    writable: true,
  });

  Object.defineProperty(app, 'connectedCallback', {
    value: connectedCallback,
    writable: true,
  });

  Object.defineProperty(app, 'disconnectedCallback', {
    value: disconnectedCallback,
    writable: true,
  });

  Object.defineProperty(app, 'adoptedCallback', {
    value: adoptedCallback,
    writable: true,
  });

  Object.defineProperty(app, 'attributeChangedCallback', {
    value: attributeChangedCallback,
    writable: true,
  });

  // Perform initial render
  render();

  return app as unknown as MockedAppElement;
}

/**
 * Mock ShadowRoot implementation for testing
 * More comprehensive than the one in test-setup.js
 */
export class MockShadowRoot {
  childNodes: Node[] = [];
  children: Element[] = [];
  mode: ShadowRootMode = 'open';

  appendChild(node: Node): Node {
    this.childNodes.push(node);
    if (node.nodeType === 1) {
      this.children.push(node as Element);
    }
    return node;
  }

  removeChild(node: Node): Node {
    const index = this.childNodes.indexOf(node);
    if (index > -1) {
      this.childNodes.splice(index, 1);
    }

    if (node.nodeType === 1) {
      const elementIndex = this.children.indexOf(node as Element);
      if (elementIndex > -1) {
        this.children.splice(elementIndex, 1);
      }
    }

    return node;
  }

  querySelector(selector: string): Element | null {
    // Basic implementation for testing - using type assertion for ts compatibility
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.getElementById(id);
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      for (const child of this.children) {
        if (child.classList && child.classList.contains(className)) {
          return child;
        }
      }
    } else {
      // Assume tag selector
      const tagName = selector.toUpperCase();
      for (const child of this.children) {
        if (child.tagName && child.tagName.toUpperCase() === tagName) {
          return child;
        }
      }
    }
    return null;
  }

  querySelectorAll(selector: string): Element[] {
    const results: Element[] = [];

    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      const element = this.getElementById(id);
      if (element) results.push(element);
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      for (const child of this.children) {
        if (child.classList && child.classList.contains(className)) {
          results.push(child);
        }
      }
    } else if (selector.includes(',')) {
      // Handle multiple selectors separated by commas
      const selectors = selector.split(',').map((s) => s.trim());
      for (const sel of selectors) {
        const elements = this.querySelectorAll(sel);
        results.push(...elements);
      }
    } else {
      // Assume tag selector
      const tagName = selector.toUpperCase();
      for (const child of this.children) {
        if (child.tagName && child.tagName.toUpperCase() === tagName) {
          results.push(child);
        }
      }
    }

    return results;
  }

  getElementById(id: string): Element | null {
    for (const child of this.children) {
      if (child.id === id) {
        return child;
      }
    }
    return null;
  }

  get textContent(): string {
    return this.childNodes
      .map((node) => {
        if ('textContent' in node) {
          return (node as Element).textContent;
        } else if ('nodeValue' in node) {
          return (node as Text).nodeValue;
        }
        return '';
      })
      .join('');
  }

  get host(): Element {
    return document.createElement('div'); // Mock implementation
  }
}
