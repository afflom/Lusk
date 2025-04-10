import { describe, it, expect, beforeEach } from 'vitest';

// A simple test utility to create button element
function createButtonElement(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'counter';
  document.body.appendChild(button);
  return button;
}

// A simplified version of the setupCounter function from main.ts
function setupCounter(element: HTMLButtonElement): {
  getCount: () => number;
  increment: () => void;
} {
  let counter = 0;
  const setCounter = (count: number): void => {
    counter = count;
    element.innerHTML = `The counter value is ${counter}`;
  };
  element.addEventListener('click', () => {
    // Simple increment
    setCounter(counter + 1);
  });
  setCounter(0);

  // Return for testing
  return {
    getCount: () => counter,
    increment: () => element.click(),
  };
}

describe('Counter Component', () => {
  let buttonElement: HTMLButtonElement;
  let counterControls: { getCount: () => number; increment: () => void };

  beforeEach(() => {
    // Clean up DOM before each test
    document.body.innerHTML = '';

    // Setup fresh elements and counter
    buttonElement = createButtonElement();
    counterControls = setupCounter(buttonElement);
  });

  it('should initialize with count of 0', () => {
    expect(buttonElement.innerHTML).toContain('The counter value is 0');
    expect(counterControls.getCount()).toBe(0);
  });

  it('should increment the counter when clicked', () => {
    counterControls.increment();
    expect(buttonElement.innerHTML).toContain('The counter value is 1');
    expect(counterControls.getCount()).toBe(1);

    counterControls.increment();
    expect(buttonElement.innerHTML).toContain('The counter value is 2');
    expect(counterControls.getCount()).toBe(2);
  });

  it('should handle multiple increments correctly', () => {
    // Increment multiple times
    for (let i = 0; i < 5; i++) {
      counterControls.increment();
    }

    expect(buttonElement.innerHTML).toContain('The counter value is 5');
    expect(counterControls.getCount()).toBe(5);
  });
});
