/**
 * Web Component Testing Utilities
 *
 * This file provides helper functions and classes to test web components
 * in a JSDOM environment with proper mocking.
 */

import { vi } from 'vitest';
import { MockedCounterElement, MockedAppElement } from './types';
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
 * Helper function to create a properly mocked AppElement
 * @returns A fully mocked AppElement instance
 */
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
      titleElement.textContent = title;
      app.shadowRoot.appendChild(titleElement);

      // Create counter
      const counter = createMockCounterElement();
      counter.setAttribute('label', 'Counter');
      counter.setAttribute('count', '0');
      app.shadowRoot.appendChild(counter);

      // Create description
      const description = document.createElement('p');
      description.className = 'read-the-docs';
      description.textContent = 'Click on the button to test the counter';
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
        title = newValue || 'TypeScript PWA Template';
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
