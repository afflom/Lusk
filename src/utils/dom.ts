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

/**
 * Notification options interface
 */
export interface NotificationOptions {
  id?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  parent?: HTMLElement | null;
  autoClose?: boolean;
  closeAfterMs?: number;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

/**
 * Creates and displays a notification
 * @param message - Notification message (can include HTML)
 * @param options - Notification display options
 * @returns The created notification element
 */
export function createNotification(
  message: string,
  options: NotificationOptions = {}
): HTMLElement {
  // Default options
  const {
    id = `notification-${Date.now()}`,
    type = 'info',
    parent = document.body,
    autoClose = true,
    closeAfterMs = 5000,
    position = 'top-right',
  } = options;

  // Create container if it doesn't exist
  const containerId = 'notification-container';
  let container = document.getElementById(containerId);

  if (!container) {
    container = createElement('div', {
      id: containerId,
      class: `notification-container ${position}`,
    });

    // Add container styles
    const style = document.createElement('style');
    style.textContent = `
      .notification-container {
        position: fixed;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      }
      .notification-container.top-right {
        top: 20px;
        right: 20px;
      }
      .notification-container.top-left {
        top: 20px;
        left: 20px;
      }
      .notification-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      .notification-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      .notification-container.top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      .notification-container.bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      .notification {
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        animation: notification-fade-in 0.3s ease-out;
        position: relative;
        background-color: white;
        border-left: 4px solid #1a73e8;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
      }
      .notification.info {
        border-left-color: #1a73e8;
      }
      .notification.success {
        border-left-color: #34a853;
      }
      .notification.warning {
        border-left-color: #fbbc05;
      }
      .notification.error {
        border-left-color: #ea4335;
      }
      .notification-message {
        margin-right: 24px;
        flex: 1;
      }
      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
      }
      .notification-close:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.1);
      }
      @keyframes notification-fade-in {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes notification-fade-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-20px);
        }
      }
      .notification.fade-out {
        animation: notification-fade-out 0.3s ease-in forwards;
      }
    `;
    document.head.appendChild(style);

    if (parent) {
      parent.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }

  // Create notification element
  const notification = createElement('div', {
    id,
    class: `notification ${type}`,
    role: 'alert',
  });

  // Create message container (allows HTML content)
  const messageEl = createElement('div', { class: 'notification-message' });
  messageEl.innerHTML = message;
  notification.appendChild(messageEl);

  // Create close button
  const closeButton = createElement('button', {
    class: 'notification-close',
    'aria-label': 'Close notification',
  });
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    closeNotification(notification);
  });
  notification.appendChild(closeButton);

  // Add to container
  container.appendChild(notification);

  // Auto-close after delay if needed
  if (autoClose && closeAfterMs > 0) {
    setTimeout(() => {
      closeNotification(notification);
    }, closeAfterMs);
  }

  return notification;
}

/**
 * Closes a notification with animation
 * @param notification - Notification element to close
 */
function closeNotification(notification: HTMLElement): void {
  notification.classList.add('fade-out');
  notification.addEventListener('animationend', () => {
    notification.remove();

    // Remove container if it's empty
    const container = document.getElementById('notification-container');
    if (container && !container.hasChildNodes()) {
      container.remove();
    }
  });
}
