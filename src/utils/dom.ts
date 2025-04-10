/**
 * DOM utility functions
 */

/**
 * Creates an element with attributes and children
 * @param tag - HTML tag name
 * @param attributes - Element attributes
 * @param children - Child elements or text content
 * @returns Created HTML element
 */
export function createElement<T extends HTMLElement>(
  tag: string,
  attributes: Record<string, string> = {},
  children: (HTMLElement | string)[] = []
): T {
  const element = document.createElement(tag) as T;

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  // Add children
  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Appends an element to the DOM
 * @param parent - Parent element selector or element
 * @param child - Child element to append
 * @returns The appended child element
 */
export function appendElement<T extends HTMLElement>(parent: string | HTMLElement, child: T): T {
  const parentElement = typeof parent === 'string' ? document.querySelector(parent) : parent;

  if (!parentElement) {
    throw new Error(
      `Parent element ${typeof parent === 'string' ? parent : 'HTMLElement'} not found`
    );
  }

  parentElement.appendChild(child);
  return child;
}

/**
 * Gets or creates an element in the DOM
 * @param selector - CSS selector for element
 * @param createFn - Function to create element if not found
 * @returns Found or created element
 */
export function getOrCreateElement<T extends HTMLElement>(selector: string, createFn: () => T): T {
  const element = document.querySelector(selector) as T;
  if (element) {
    return element;
  }

  const newElement = createFn();
  document.body.appendChild(newElement);
  return newElement;
}
