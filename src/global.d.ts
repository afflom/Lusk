/**
 * Global type definitions for the application
 */

// Add the registry property to the Window interface
interface Window {
  // Registry for custom elements in test environments
  __WEB_COMPONENTS_REGISTRY?: Map<string, CustomElementConstructor>;
}
