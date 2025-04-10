/**
 * Test setup file for Vitest
 *
 * This file provides polyfills and setup for testing web components with JSDOM
 */

// Polyfill for Custom Elements - needed for JSDOM tests
if (!window.customElements) {
  window.customElements = {
    define: () => {},
    get: () => undefined,
    whenDefined: () => Promise.resolve(),
  };
}

// Simple Shadow DOM mock for testing
global.MockShadowRoot = class MockShadowRoot {
  constructor() {
    this.childNodes = [];
    this.children = [];
  }

  appendChild(node) {
    this.childNodes.push(node);
    if (node.nodeType === 1) {
      // ELEMENT_NODE
      this.children.push(node);
    }
    return node;
  }

  getElementById(id) {
    for (const child of this.childNodes) {
      if (child.id === id) {
        return child;
      }
    }
    return null;
  }

  querySelector(selector) {
    // Simplified implementation
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.getElementById(id);
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      for (const child of this.childNodes) {
        if (child.className && child.className.includes(className)) {
          return child;
        }
      }
    } else {
      // Assume tag selector
      for (const child of this.childNodes) {
        if (child.tagName && child.tagName.toLowerCase() === selector.toLowerCase()) {
          return child;
        }
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    // Simplified implementation
    if (selector.startsWith('#')) {
      const element = this.getElementById(selector.substring(1));
      if (element) results.push(element);
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      for (const child of this.childNodes) {
        if (child.className && child.className.includes(className)) {
          results.push(child);
        }
      }
    } else {
      // Assume tag selector
      for (const child of this.childNodes) {
        if (child.tagName && child.tagName.toLowerCase() === selector.toLowerCase()) {
          results.push(child);
        }
      }
    }
    return results;
  }

  /**
   * Implements the standard DOM textContent getter for shadow roots.
   * This recursively concatenates the text content of all child nodes.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
   */
  get textContent() {
    return this.childNodes
      .map((node) => {
        if (typeof node.textContent === 'string') {
          return node.textContent;
        } else if (node.nodeValue) {
          return node.nodeValue;
        }
        return '';
      })
      .join('');
  }
};

// Add attachShadow method to Element prototype if not present
if (!Element.prototype.attachShadow) {
  Element.prototype.attachShadow = function () {
    this.shadowRoot = new MockShadowRoot();
    return this.shadowRoot;
  };
}

// Make sure document.createElement can handle custom elements
const originalCreateElement = document.createElement;
document.createElement = function (tagName, options) {
  // Check if it's a custom element (contains a hyphen)
  if (typeof tagName === 'string' && tagName.includes('-')) {
    // It's a custom element
    try {
      // First try the original createElement - some environments support custom elements
      const element = originalCreateElement.call(document, tagName, options);
      
      // If we're in a test environment without native custom element support,
      // we need to enhance the element to behave like a custom element
      if (!element.attachShadow) {
        element.attachShadow = function(options) {
          const shadowRoot = new MockShadowRoot();
          Object.defineProperty(this, 'shadowRoot', {
            value: shadowRoot,
            writable: false,
            configurable: true,
          });
          return shadowRoot;
        };
      }
      
      // Add other custom element features if needed
      return element;
    } catch (e) {
      // If creation fails (most likely in JSDOM without custom elements support)
      // Fall back to creating a div and adding custom element properties
      console.warn(`Creating fallback for custom element: ${tagName}`, e);
      const element = originalCreateElement.call(document, 'div', options);
      
      // Set a custom tagName property
      Object.defineProperty(element, 'tagName', {
        get: function() {
          return tagName.toUpperCase();
        },
      });
      
      // Add ability to attach shadow root
      element.attachShadow = function(options) {
        const shadowRoot = new MockShadowRoot();
        Object.defineProperty(this, 'shadowRoot', {
          value: shadowRoot,
          writable: false,
          configurable: true,
        });
        return shadowRoot;
      };
      
      // Override element.matches for our custom elements
      const originalMatches = element.matches;
      element.matches = function (selector) {
        if (selector.toLowerCase() === tagName.toLowerCase()) {
          return true;
        }
        return originalMatches.call(this, selector);
      };
      
      return element;
    }
  }
  
  // For normal elements, use the original createElement
  return originalCreateElement.call(document, tagName, options);
};

// Set up a global registry to keep track of defined web components
window.__WEB_COMPONENTS_REGISTRY = new Map();

// For tests, register custom elements globally
global.registerCustomElement = function (name, elementClass) {
  window.__WEB_COMPONENTS_REGISTRY.set(name, elementClass);
  try {
    // Already defined? Skip
    if (customElements.get(name)) return;
    customElements.define(name, elementClass);
  } catch (e) {
    console.warn(`Error registering custom element ${name}:`, e);
  }
};

// Export a helper to create instances of custom elements for testing
global.createCustomElement = function (name, props = {}) {
  const element = document.createElement(name);
  Object.entries(props).forEach(([key, value]) => {
    element[key] = value;
  });
  return element;
};

// Add mockWebComponent helper for tests
global.mockWebComponent = function (name) {
  class MockComponent extends HTMLElement {
    constructor() {
      super();
      // Use attachShadow instead of direct assignment
      this.attachShadow({ mode: 'open' });
      // Store attributes privately to avoid conflicts with Element properties
      this._mockAttributes = new Map();
    }

    getAttribute(name) {
      // Try the native implementation first
      const nativeValue = super.getAttribute && super.getAttribute(name);
      if (nativeValue !== null && nativeValue !== undefined) {
        return nativeValue;
      }
      // Fall back to our internal map
      return this._mockAttributes.get(name) || null;
    }

    setAttribute(name, value) {
      try {
        // Try to use the native implementation first
        if (super.setAttribute) {
          super.setAttribute(name, value);
        }
      } catch (e) {
        // If native implementation fails, use our internal map
        this._mockAttributes.set(name, value);
      }
      
      // Always call attributeChangedCallback if it exists
      if (this.attributeChangedCallback) {
        const oldValue = this._mockAttributes.get(name);
        this._mockAttributes.set(name, value);
        this.attributeChangedCallback(name, oldValue, value);
      }
    }

    connectedCallback() {}
    disconnectedCallback() {}
    adoptedCallback() {}
    attributeChangedCallback() {}
  }

  try {
    if (!customElements.get(name)) {
      customElements.define(name, MockComponent);
    }
  } catch (e) {
    console.warn(`Error registering mock component ${name}:`, e);
  }
  
  return MockComponent;
};

// Register our main components for tests with observed attributes
const AppRootMock = mockWebComponent('app-root');
// Add observed attributes to match the real component
AppRootMock.observedAttributes = ['title'];

const AppCounterMock = mockWebComponent('app-counter');
// Add observed attributes to match the real component
AppCounterMock.observedAttributes = ['count', 'label'];

// Register these enhanced mocks
if (!customElements.get('app-root')) {
  customElements.define('app-root', AppRootMock);
}
if (!customElements.get('app-counter')) {
  customElements.define('app-counter', AppCounterMock);
}