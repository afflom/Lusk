/**
 * TypeScript type declarations for testing utilities
 */

import { MockShadowRoot } from './web-components';
import { Mock } from 'vitest';

// Type for mocked CounterElement
export interface MockedCounterElement extends HTMLElement {
  getValue: Mock;
  increment: Mock;
  updateDisplay: Mock;
  connectedCallback: Mock;
  disconnectedCallback: Mock;
  attributeChangedCallback: Mock;
  shadowRoot: MockShadowRoot;
}

// Type for mocked AppElement
export interface MockedAppElement extends HTMLElement {
  render: Mock;
  connectedCallback: Mock;
  disconnectedCallback: Mock;
  adoptedCallback: Mock;
  attributeChangedCallback: Mock;
  shadowRoot: MockShadowRoot;
}

// Declare global extension types
declare global {
  interface Window {
    __WEB_COMPONENTS_REGISTRY?: Map<string, CustomElementConstructor>;
  }
}
