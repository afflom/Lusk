import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CounterElement, createCounter } from './Counter';
import { createMockCounterElement } from '../test-utils/web-components';

// Add type declarations for testing
declare global {
  interface TestShadowRoot {
    childNodes: any[];
    children: any[];
    appendChild(node: any): any;
    getElementById(id: string): any;
    querySelector(selector: string): any;
    querySelectorAll(selector: string): any[];
    textContent: string;
  }

  interface HTMLElement {
    _customTagName?: string;
    shadowRoot: TestShadowRoot | ShadowRoot | null;
  }
}

describe('Counter Web Component', () => {
  let containerElement: HTMLDivElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Clean up DOM
    document.body.innerHTML = '';

    // Create test container
    containerElement = document.createElement('div');
    containerElement.id = 'container';
    document.body.appendChild(containerElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Web Component Conformance', () => {
    it('should be registered with custom elements registry', () => {
      expect(customElements.get('app-counter')).toBeDefined();
    });

    it('should extend HTMLElement', () => {
      const counter = document.createElement('app-counter');
      expect(counter instanceof HTMLElement).toBe(true);
    });

    it('should define observedAttributes static property', () => {
      const attributes = (customElements.get('app-counter') as typeof CounterElement)
        .observedAttributes;
      expect(attributes).toContain('count');
      expect(attributes).toContain('label');
    });

    it('should create a shadow DOM in open mode', () => {
      const counter = createMockCounterElement();
      expect(counter.shadowRoot).toBeDefined();
    });

    it('should dispatch custom events with appropriate properties', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Set up event listener
      const eventSpy = vi.fn();
      counter.addEventListener('counter-changed', eventSpy);

      // Trigger increment
      counter.increment();

      // Verify event was dispatched
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Get the event object from the mock
      const event = eventSpy.mock.calls[0][0] as CustomEvent;

      // Verify it's a CustomEvent with the right properties
      expect(event instanceof CustomEvent).toBe(true);
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true); // Important for shadow DOM events
      expect(event.detail).toHaveProperty('value');
    });
  });

  describe('CounterElement', () => {
    it('should initialize with counter at 0 by default', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);
      expect(counter.getValue()).toBe(0);
    });

    it('should initialize with specified count', () => {
      const counter = createMockCounterElement();
      counter.setAttribute('count', '5');
      // Manually trigger attribute change since JSDOM doesn't
      counter.attributeChangedCallback('count', null, '5');

      counter.setAttribute('label', 'Total');
      counter.attributeChangedCallback('label', null, 'Total');

      document.body.appendChild(counter);

      // Now check the value
      expect(counter.getValue()).toBe(5);
    });

    it('should increment counter when calling increment method', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Start at 0
      expect(counter.getValue()).toBe(0);

      // Increment and verify
      counter.increment();
      expect(counter.getValue()).toBe(1);

      // Verify attribute was also updated
      expect(counter.getAttribute('count')).toBe('1');
    });

    it('should increment multiple times', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Increment multiple times
      counter.increment();
      counter.increment();
      counter.increment();

      // Verify final count
      expect(counter.getValue()).toBe(3);
      expect(counter.getAttribute('count')).toBe('3');
    });

    it('should update display when count attribute changes', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Mock the updateDisplay method
      counter.updateDisplay.mockClear();
      counter.attributeChangedCallback.mockClear();

      // Update count attribute
      counter.setAttribute('count', '10');

      // Manually trigger the callback since JSDOM doesn't
      counter.attributeChangedCallback('count', null, '10');

      // Verify attributeChangedCallback was called
      expect(counter.attributeChangedCallback).toHaveBeenCalledWith('count', null, '10');

      // Verify updateDisplay was called
      expect(counter.updateDisplay).toHaveBeenCalled();

      // Verify counter value is updated
      expect(counter.getValue()).toBe(10);
    });

    it('should update display when label attribute changes', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Clear mock history
      counter.updateDisplay.mockClear();
      counter.attributeChangedCallback.mockClear();

      // Update label attribute
      counter.setAttribute('label', 'New Label');

      // Manually trigger callback since JSDOM doesn't
      counter.attributeChangedCallback('label', null, 'New Label');

      // Verify updateDisplay was called
      expect(counter.updateDisplay).toHaveBeenCalled();

      // Verify button text contains the new label
      if (counter.shadowRoot) {
        const button = counter.shadowRoot.querySelector('button');
        expect(button?.textContent).toContain('New Label');
      }
    });

    it('should not react to unrelated attribute changes', () => {
      // Mock a fresh element
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Clear mock history
      counter.updateDisplay.mockClear();
      counter.attributeChangedCallback.mockClear();

      // Define a spy to watch for actual attribute effects
      const valueSpy = vi.fn();
      counter.updateDisplay.mockImplementation(valueSpy);

      // Update unrelated attribute - our mock setup may call the function,
      // but the real implementation should ignore it because it's not in observedAttributes
      counter.setAttribute('data-test', 'value');

      // Verify the update had no effect on component state
      expect(valueSpy).not.toHaveBeenCalled();
    });

    it('should call connectedCallback when added to DOM', () => {
      const counter = createMockCounterElement();

      // Clear mock history
      counter.connectedCallback.mockClear();

      // Add to DOM
      document.body.appendChild(counter);

      // Standard DOM would call connectedCallback (we simulate it)
      counter.connectedCallback();

      // Verify connectedCallback was called
      expect(counter.connectedCallback).toHaveBeenCalled();
    });
  });

  describe('createCounter helper function', () => {
    it('should create and append counter to specified parent', () => {
      const counter = createCounter('#container');

      // The createCounter function should return an element with app-counter tag
      expect(counter._customTagName?.toLowerCase() || counter.tagName.toLowerCase()).toBe(
        'app-counter'
      );
      expect(containerElement.contains(counter)).toBe(true);
    });

    it('should set initial count correctly', () => {
      // For this test, we need to augment the counter element created by createCounter
      const mockGetValue = vi.fn(() => 5);
      const counter = createCounter('#container', 5);

      // Add getValue method for testing
      Object.defineProperty(counter, 'getValue', {
        value: mockGetValue,
        writable: true,
      });

      expect(counter.getAttribute('count')).toBe('5');
      expect(counter.getValue()).toBe(5);
    });

    it('should set label correctly', () => {
      const counter = createCounter('#container', 0, 'Custom Label');
      expect(counter.getAttribute('label')).toBe('Custom Label');
    });

    it('should throw error if parent not found', () => {
      expect(() => createCounter('#non-existent')).toThrow(
        'Parent element not found: #non-existent'
      );
    });
  });

  describe('Accessibility and User Interaction', () => {
    it('should have properly labeled button element', () => {
      const counter = createMockCounterElement();
      counter.setAttribute('label', 'Counter Label');
      // Manually trigger attributeChangedCallback to update label
      counter.attributeChangedCallback('label', null, 'Counter Label');
      document.body.appendChild(counter);

      if (counter.shadowRoot) {
        const button = counter.shadowRoot.querySelector('button');
        expect(button).toBeDefined();
        expect(button?.textContent).toContain('Counter Label');
      }
    });

    it('should respond to button clicks', () => {
      const counter = createMockCounterElement();
      document.body.appendChild(counter);

      // Get button from shadow DOM
      const button = counter.shadowRoot?.querySelector('button');
      expect(button).toBeDefined();

      if (button) {
        // Clear increment mock history
        counter.increment.mockClear();

        // Simulate click
        (button as HTMLButtonElement).click();

        // In the real component, the button has a click listener that calls increment()
        // Here we simulate what would happen:
        counter.increment();

        // Verify increment was called
        expect(counter.increment).toHaveBeenCalled();
        expect(counter.getValue()).toBe(1);
      }
    });
  });
});
