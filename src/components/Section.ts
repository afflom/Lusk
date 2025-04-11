/**
 * Reusable section component
 * Provides a standardized container for content sections
 */
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';

export class SectionElement extends HTMLElement {
  private _title: string = '';
  private _id: string = '';

  // Shadow root for encapsulation
  private _root: ShadowRoot;

  // Observed attributes
  static get observedAttributes(): string[] {
    return ['title', 'section-id'];
  }

  constructor() {
    super();

    // Create shadow DOM
    this._root = this.attachShadow({ mode: 'open' });

    // Get initial attribute values
    this._title = this.getAttribute('title') || '';
    this._id = this.getAttribute('section-id') || '';

    // Initialize component
    this.render();
  }

  /**
   * Lifecycle: when element is added to DOM
   */
  connectedCallback(): void {
    try {
      // Ensure all content is up-to-date
      this.render();
    } catch (error) {
      logger.error(
        'Error in SectionElement connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error initializing section component' },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Lifecycle: when attributes change
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    try {
      if (oldValue === newValue) return;

      if (name === 'title') {
        this._title = newValue || '';
        this.updateTitle();
      } else if (name === 'section-id') {
        this._id = newValue || '';
        this.updateId();
      }
    } catch (error) {
      logger.error(
        'Error in SectionElement attributeChangedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update section title
   */
  private updateTitle(): void {
    const titleEl = this._root.querySelector('.section-title');
    if (titleEl) {
      titleEl.textContent = this._title;
    }
  }

  /**
   * Update section ID
   */
  private updateId(): void {
    const container = this._root.querySelector('.section-container');
    if (container && this._id) {
      container.id = this._id;
    }
  }

  /**
   * Render the section
   */
  private render(): void {
    // Clear existing content first
    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        margin-bottom: ${THEME.spacing.xl};
      }
      
      .section-container {
        background-color: ${THEME.colors.background.darker};
        border-radius: ${THEME.borderRadius.lg};
        padding: ${THEME.spacing.lg};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .section-title {
        font-size: ${THEME.fontSizes.xlarge};
        color: ${THEME.colors.secondary};
        margin-top: 0;
        margin-bottom: ${THEME.spacing.md};
        padding-bottom: ${THEME.spacing.sm};
        border-bottom: 1px solid ${THEME.colors.border};
      }
      
      .section-content {
        line-height: 1.6;
      }
      
      ::slotted(h3) {
        color: ${THEME.colors.primary};
        font-size: ${THEME.fontSizes.large};
        margin-top: ${THEME.spacing.lg};
        margin-bottom: ${THEME.spacing.md};
      }
      
      ::slotted(p) {
        margin-bottom: ${THEME.spacing.md};
      }
      
      /* Responsive styles */
      @media (max-width: 768px) {
        .section-container {
          padding: ${THEME.spacing.md};
        }
        
        .section-title {
          font-size: ${THEME.fontSizes.large};
        }
      }
    `;

    this._root.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'section-container';
    if (this._id) {
      container.id = this._id;
    }

    // Create title if provided
    if (this._title) {
      const title = document.createElement('h2');
      title.className = 'section-title';
      title.textContent = this._title;
      container.appendChild(title);
    }

    // Create content container with slot for projected content
    const content = document.createElement('div');
    content.className = 'section-content';

    const slot = document.createElement('slot');
    content.appendChild(slot);
    container.appendChild(content);

    this._root.appendChild(container);
  }
}

// Register the custom element
try {
  if (!customElements.get('app-section')) {
    customElements.define('app-section', SectionElement);
  }
} catch (error) {
  logger.error(
    'Failed to register app-section component:',
    error instanceof Error ? error : new Error(String(error))
  );
}
