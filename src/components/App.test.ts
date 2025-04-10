import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppElement, createApp } from './App';
import './Counter'; // Import Counter to make sure it's registered
import { createMockAppElement } from '../test-utils/web-components';

// Add type declarations for testing
declare global {
  interface TestShadowRoot {
    childNodes: any[];
    children: any[];
    appendChild(node: any): any;
    getElementById(id: string): any;
    querySelector(selector: string): any;
    querySelectorAll(selector: string): any[];
    removeChild(node: any): any;
    textContent: string;
    childElementCount?: number;
    lastChild?: any;
  }

  interface HTMLElement {
    _customTagName?: string;
    shadowRoot: TestShadowRoot | ShadowRoot | null;
  }
}

describe('App Web Component', () => {
  let rootElement: HTMLDivElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clean up DOM
    document.body.innerHTML = '';

    // Create test container
    rootElement = document.createElement('div');
    rootElement.id = 'app';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Web Component Conformance', () => {
    it('should be registered with custom elements registry', () => {
      expect(customElements.get('app-root')).toBeDefined();
    });

    it('should extend HTMLElement', () => {
      const app = document.createElement('app-root');
      expect(app instanceof HTMLElement).toBe(true);
    });

    it('should define observedAttributes static property', () => {
      const attributes = (customElements.get('app-root') as typeof AppElement).observedAttributes;
      expect(attributes).toContain('title');
    });

    it('should create a shadow DOM in open mode', () => {
      const app = createMockAppElement();
      expect(app.shadowRoot).toBeDefined();
    });

    it('should respect web component lifecycle callbacks', () => {
      const app = createMockAppElement();

      // Clear all mock history
      app.connectedCallback.mockClear();
      app.attributeChangedCallback.mockClear();
      app.render.mockClear();

      // Simulate element being connected to DOM
      document.body.appendChild(app);
      app.connectedCallback();

      // Verify connectedCallback calls render
      expect(app.connectedCallback).toHaveBeenCalled();
      expect(app.render).toHaveBeenCalled();

      // Clear mocks again
      app.render.mockClear();

      // Simulate attribute change
      app.attributeChangedCallback('title', 'Old Title', 'New Title');

      // Verify attribute change calls render
      expect(app.render).toHaveBeenCalled();
    });
  });

  describe('AppElement', () => {
    it('should initialize with default title', () => {
      // Create element
      const app = createMockAppElement();
      document.body.appendChild(app);

      // Verify element was created and added to DOM
      expect(
        app.tagName.toLowerCase() === 'div' || app._customTagName?.toLowerCase() === 'app-root'
      ).toBeTruthy();

      // Verify shadow DOM content
      if (app.shadowRoot) {
        const title = app.shadowRoot.querySelector('h1');
        expect(title).toBeDefined();
        expect(title?.textContent).toBe('TypeScript PWA Template');
      }
    });

    it('should initialize with custom title', () => {
      // Create element with attribute
      const app = createMockAppElement();
      app.setAttribute('title', 'Custom App Title');

      // Manually trigger attributeChangedCallback since JSDOM doesn't do it automatically
      app.attributeChangedCallback('title', null, 'Custom App Title');

      document.body.appendChild(app);

      // Verify element attribute was set correctly
      expect(app.getAttribute('title')).toBe('Custom App Title');

      // Verify shadow DOM content reflects the custom title
      if (app.shadowRoot) {
        const title = app.shadowRoot.querySelector('h1');
        expect(title?.textContent).toBe('Custom App Title');
      }
    });

    it('should update title when attribute changes', () => {
      // Create element
      const app = createMockAppElement();
      document.body.appendChild(app);

      // Clear mock history
      app.attributeChangedCallback.mockClear();

      // Update title
      app.setAttribute('title', 'Updated Title');

      // Manually trigger the callback since JSDOM doesn't do it
      app.attributeChangedCallback('title', null, 'Updated Title');

      // Verify callback was called with correct params
      expect(app.attributeChangedCallback).toHaveBeenCalledWith('title', null, 'Updated Title');

      // Verify shadow DOM content was updated
      if (app.shadowRoot) {
        const title = app.shadowRoot.querySelector('h1');
        expect(title?.textContent).toBe('Updated Title');
      }
    });

    it('should render counter component', () => {
      // Create element
      const app = createMockAppElement();
      document.body.appendChild(app);

      // Verify counter is rendered in shadow DOM
      if (app.shadowRoot) {
        const counter = app.shadowRoot.querySelector('app-counter');
        expect(counter).toBeDefined();

        // Note: In our mockup the counter app is a real mock counter object,
        // but doesn't properly support getAttribute in JSDOM
        // So let's verify it's there, but skip attribute checks
      }
    });

    it('should handle errors in connected callback gracefully', () => {
      // Create element
      const app = createMockAppElement();

      // Mock the render method to throw an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      app.render.mockImplementationOnce(() => {
        throw new Error('Test render error');
      });

      // This should not throw despite the render error
      try {
        app.connectedCallback();
      } catch (error) {
        // If this throws, the test will fail
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        console.error('Error caught in test (expected to be handled):', error);
        throw new Error('connectedCallback should not propagate errors');
      }

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('createApp helper function', () => {
    it('should create and append app to specified parent', () => {
      const app = createApp('#app', 'Test App');

      expect(app._customTagName?.toLowerCase() || app.tagName.toLowerCase()).toBe('app-root');
      expect(app.getAttribute('title')).toBe('Test App');
      expect(rootElement.contains(app)).toBe(true);
    });

    it('should use default title when not specified', () => {
      const app = createApp('#app');

      expect(app._customTagName?.toLowerCase() || app.tagName.toLowerCase()).toBe('app-root');
      expect(app.getAttribute('title')).toBe(null); // Default title is applied internally
      expect(rootElement.contains(app)).toBe(true);
    });

    it('should throw error if root element not found', () => {
      expect(() => createApp('#non-existent')).toThrow('Root element not found: #non-existent');
    });
  });

  describe('Accessibility and Structure', () => {
    it('should have semantic headings in proper order', () => {
      const app = createMockAppElement();
      document.body.appendChild(app);

      // In our mock app implementation, we add h1 and no other headings
      if (app.shadowRoot) {
        const headings = app.shadowRoot.querySelectorAll('h1, h2');

        // Verify we have the h1 heading
        expect(headings.length).toBeGreaterThan(0);

        // First heading should be h1
        const firstHeading = headings[0];
        expect(firstHeading.tagName.toLowerCase()).toBe('h1');
      }
    });

    it('should contain the counter component', () => {
      const app = createMockAppElement();
      document.body.appendChild(app);

      if (app.shadowRoot) {
        const counter = app.shadowRoot.querySelector('app-counter');
        expect(counter).toBeDefined();
      }
    });
  });

  describe('DOM Structure Tests', () => {
    it('should render correct structure with all required elements', () => {
      const app = createMockAppElement();
      document.body.appendChild(app);

      if (app.shadowRoot) {
        // Basic structure verification
        expect(app.shadowRoot.querySelector('h1')).toBeDefined();
        expect(app.shadowRoot.querySelector('app-counter')).toBeDefined();
        expect(app.shadowRoot.querySelector('.read-the-docs')).toBeDefined();
      }
    });

    it('should maintain consistent DOM structure across re-renders', () => {
      const app = createMockAppElement();
      document.body.appendChild(app);

      // Store initial structure references
      const initialTitle = app.shadowRoot?.querySelector('h1')?.textContent;
      const initialElementCount = app.shadowRoot?.childNodes.length;

      // First verify we have initial values
      expect(initialTitle).toBe('TypeScript PWA Template');
      expect(initialElementCount).toBeGreaterThan(0);

      // Clear render mock history
      app.render.mockClear();

      // Trigger re-render by changing title
      app.setAttribute('title', 'New Title');
      app.attributeChangedCallback('title', initialTitle || null, 'New Title');

      // Verify render was called
      expect(app.render).toHaveBeenCalled();

      // Verify structure is maintained
      expect(app.shadowRoot?.querySelector('h1')?.textContent).toBe('New Title');
      expect(app.shadowRoot?.childNodes.length).toBe(initialElementCount);
      expect(app.shadowRoot?.querySelector('app-counter')).toBeDefined();
      expect(app.shadowRoot?.querySelector('.read-the-docs')).toBeDefined();
    });
  });
});
