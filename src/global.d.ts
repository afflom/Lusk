/**
 * Global type definitions for the application
 */

// Add the registry property to the Window interface
interface Window {
  // Registry for custom elements in test environments
  __WEB_COMPONENTS_REGISTRY?: Map<string, CustomElementConstructor>;

  // Google Analytics gtag function
  gtag?: (command: string, eventName: string, eventParams?: Record<string, unknown>) => void;
}
