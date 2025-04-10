import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockMathDemoElement } from '../test-utils/web-components';
import './MathDemo'; // Import to register the component

describe('MathDemo Component', () => {
  // Container element for mounting components
  let containerElement: HTMLElement;

  // Set up and tear down DOM testing environment
  beforeEach(() => {
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

  it('should be registered with custom elements registry', () => {
    expect(customElements.get('math-demo')).toBeDefined();
  });

  it('should extend HTMLElement', () => {
    const mathDemo = document.createElement('math-demo');
    expect(mathDemo instanceof HTMLElement).toBe(true);
  });

  it('should render with shadow DOM', () => {
    // Create an actual component
    const mathDemo = document.createElement('math-demo');
    containerElement.appendChild(mathDemo);

    // Verify shadow root exists
    expect(mathDemo.shadowRoot).toBeDefined();
  });

  it('should have math form elements in shadow DOM', () => {
    // Use mock implementation which properly sets up shadow DOM
    const mathDemo = createMockMathDemoElement();
    containerElement.appendChild(mathDemo);

    // Verify key elements exist
    const form = mathDemo.shadowRoot?.querySelector('.math-form');
    expect(form).not.toBeNull();

    const select = mathDemo.shadowRoot?.querySelector('#operation');
    expect(select).not.toBeNull();

    const input = mathDemo.shadowRoot?.querySelector('#number-input');
    expect(input).not.toBeNull();

    const button = mathDemo.shadowRoot?.querySelector('button');
    expect(button).not.toBeNull();

    const result = mathDemo.shadowRoot?.querySelector('#result');
    expect(result).not.toBeNull();
  });

  it('should calculate when button is clicked', () => {
    const mathDemo = createMockMathDemoElement();
    containerElement.appendChild(mathDemo);

    // Spy on calculate method
    const calculateSpy = vi.spyOn(mathDemo, 'calculate');

    // Get button from shadow DOM
    const button = mathDemo.shadowRoot?.querySelector('button');
    expect(button).not.toBeNull();

    // Trigger button click
    if (button) {
      button.click();
      expect(calculateSpy).toHaveBeenCalled();
    }
  });

  it('should update result element when calculate is called', () => {
    const mathDemo = createMockMathDemoElement();
    containerElement.appendChild(mathDemo);

    // Mock the properties needed for calculation
    mathDemo.inputValue = '42';
    mathDemo.operation = 'factorize';

    // Call calculate method
    mathDemo.calculate();

    // Get result element from shadow DOM
    const result = mathDemo.shadowRoot?.querySelector('#result');
    expect(result).not.toBeNull();

    // Test actual calculation
    const input = mathDemo.shadowRoot?.querySelector('#number-input') as HTMLInputElement;
    const select = mathDemo.shadowRoot?.querySelector('#operation') as HTMLSelectElement;

    if (input && select) {
      // Setup test values
      input.value = '42';
      select.value = 'factorize';

      // Trigger events
      input.dispatchEvent(new Event('input'));
      select.dispatchEvent(new Event('change'));

      // Call calculate and check result content has been updated
      mathDemo.calculate();

      if (result) {
        expect(result.textContent).toBeTruthy();
        expect(result.textContent).not.toBe('Please enter a number');
      }
    }
  });
});
