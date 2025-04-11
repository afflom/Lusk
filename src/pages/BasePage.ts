/**
 * Base page component for consistent page structure
 * This class provides a foundation for all page components in the application
 */
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';

export class BasePage extends HTMLElement {
  protected _title: string = '';
  protected _initialized = false;

  // Shadow root for encapsulation
  protected _root: ShadowRoot;

  // Common observed attributes
  static get observedAttributes(): string[] {
    return ['title', 'active'];
  }

  constructor() {
    super();

    // Create shadow DOM for encapsulation
    this._root = this.attachShadow({ mode: 'open' });

    // Initialize styles
    this.initStyles();
  }

  /**
   * Initialize the base styles for all pages
   */
  protected initStyles(): void {
    // Create and append base styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
        color: ${THEME.colors.text.primary};
        background-color: ${THEME.colors.background.main};
        padding: ${THEME.spacing.lg};
        box-sizing: border-box;
      }
      
      :host([hidden]) {
        display: none;
      }
      
      :host(:not([active])) {
        display: none;
      }
      
      .page-container {
        max-width: 1200px;
        margin: 0 auto;
        overflow: hidden;
      }
      
      .page-title {
        font-size: ${THEME.fontSizes.xxlarge};
        margin-bottom: ${THEME.spacing.xl};
        color: ${THEME.colors.primary};
        text-align: center;
      }
      
      .page-section {
        margin-bottom: ${THEME.spacing.xl};
        padding: ${THEME.spacing.lg};
        background-color: ${THEME.colors.background.darker};
        border-radius: ${THEME.borderRadius.lg};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .section-title {
        font-size: ${THEME.fontSizes.xlarge};
        margin-bottom: ${THEME.spacing.md};
        color: ${THEME.colors.secondary};
        border-bottom: 1px solid ${THEME.colors.border};
        padding-bottom: ${THEME.spacing.sm};
      }
      
      .section-content {
        line-height: 1.6;
      }
      
      /* Responsive adjustments */
      @media (max-width: 768px) {
        :host {
          padding: ${THEME.spacing.md};
        }
        
        .page-title {
          font-size: ${THEME.fontSizes.xlarge};
          margin-bottom: ${THEME.spacing.lg};
        }
        
        .page-section {
          padding: ${THEME.spacing.md};
          margin-bottom: ${THEME.spacing.lg};
        }
        
        .section-title {
          font-size: ${THEME.fontSizes.large};
        }
      }
      
      @media (max-width: 480px) {
        :host {
          padding: ${THEME.spacing.sm};
        }
        
        .page-section {
          padding: ${THEME.spacing.sm};
        }
      }
    `;

    this._root.appendChild(style);
  }

  /**
   * Create a standard section container
   * @param title - Section title
   * @param id - Optional section ID for direct linking
   * @returns The created section element
   */
  protected createSection(title: string, id?: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'page-section';
    if (id) {
      section.id = id;
    }

    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    const content = document.createElement('div');
    content.className = 'section-content';
    section.appendChild(content);

    return section;
  }

  /**
   * Lifecycle: when element is added to DOM
   */
  connectedCallback(): void {
    try {
      if (!this._initialized) {
        this.render();
        this._initialized = true;
      }
    } catch (error) {
      logger.error(
        'Error in BasePage connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );

      // Dispatch error event
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error, message: 'Error initializing page component' },
          bubbles: true,
          composed: true,
        })
      );

      // Show error fallback
      this.renderErrorFallback(error);
    }
  }

  /**
   * Lifecycle: when element is removed from DOM
   */
  disconnectedCallback(): void {
    try {
      // Clean up resources or event listeners if needed
    } catch (error) {
      logger.error(
        'Error in BasePage disconnectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Lifecycle: when attributes change
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    try {
      if (name === 'title' && oldValue !== newValue) {
        this._title = newValue || '';
        this.updateTitle();
      } else if (name === 'active' && oldValue !== newValue) {
        // Handle visibility change
        if (newValue !== null) {
          this.onActivate();
        } else {
          this.onDeactivate();
        }
      }
    } catch (error) {
      logger.error(
        'Error in BasePage attributeChangedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update the page title
   */
  protected updateTitle(): void {
    const titleEl = this._root.querySelector('.page-title');
    if (titleEl && this._title) {
      titleEl.textContent = this._title;
    }
  }

  /**
   * Called when the page becomes active
   * Override in subclasses if needed
   */
  protected onActivate(): void {
    // Default implementation does nothing
  }

  /**
   * Called when the page becomes inactive
   * Override in subclasses if needed
   */
  protected onDeactivate(): void {
    // Default implementation does nothing
  }

  /**
   * Render the page content
   * Must be implemented by subclasses
   */
  protected render(): void {
    // Create base structure
    const container = document.createElement('div');
    container.className = 'page-container';

    // Add page title if set
    if (this._title) {
      const titleEl = document.createElement('h1');
      titleEl.className = 'page-title';
      titleEl.textContent = this._title;
      container.appendChild(titleEl);
    }

    // Append to shadow root
    this._root.appendChild(container);
  }

  /**
   * Render fallback content in case of error
   */
  protected renderErrorFallback(error: unknown): void {
    try {
      // Clear shadow root first
      while (this._root.firstChild) {
        this._root.removeChild(this._root.firstChild);
      }

      // Re-add styles
      this.initStyles();

      // Add error message
      const errorContainer = document.createElement('div');
      errorContainer.className = 'error-container';
      errorContainer.innerHTML = `
        <style>
          .error-container {
            padding: ${THEME.spacing.lg};
            border: 1px solid #ff3e3e;
            border-radius: ${THEME.borderRadius.md};
            margin: ${THEME.spacing.lg} 0;
            background-color: rgba(255, 62, 62, 0.1);
          }
          
          .error-title {
            color: #ff3e3e;
            margin-top: 0;
          }
          
          .error-message {
            margin-top: ${THEME.spacing.md};
            padding: ${THEME.spacing.md};
            background-color: rgba(0, 0, 0, 0.1);
            border-radius: ${THEME.borderRadius.sm};
            overflow: auto;
            font-family: monospace;
            white-space: pre-wrap;
          }
        </style>
        <h2 class="error-title">Page Error</h2>
        <p>There was an error rendering this page:</p>
        <div class="error-message">${error instanceof Error ? error.message : String(error)}</div>
      `;

      this._root.appendChild(errorContainer);
    } catch (fallbackError) {
      // Last resort error handling
      logger.error(
        'Error showing fallback UI:',
        fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
      );
    }
  }
}
