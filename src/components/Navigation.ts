/**
 * Navigation component for the application
 * Provides navigation between different sections/pages
 */
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';

/**
 * Navigation item structure
 */
export interface NavItem {
  id: string;
  label: string;
  path?: string;
  active?: boolean;
}

export class NavigationElement extends HTMLElement {
  private _items: NavItem[] = [];
  private _root: ShadowRoot;

  /**
   * Set navigation items
   */
  set items(items: NavItem[]) {
    this._items = items;
    this.renderItems();
  }

  /**
   * Get current navigation items
   */
  get items(): NavItem[] {
    return [...this._items];
  }

  constructor() {
    super();

    // Create shadow DOM
    this._root = this.attachShadow({ mode: 'open' });

    // Initialize component
    this.render();
  }

  /**
   * Lifecycle: when element is added to DOM
   */
  connectedCallback(): void {
    try {
      // Initialize any event listeners
    } catch (error) {
      logger.error(
        'Error in NavigationElement connectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Lifecycle: when element is removed from DOM
   */
  disconnectedCallback(): void {
    try {
      // Clean up event listeners
    } catch (error) {
      logger.error(
        'Error in NavigationElement disconnectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Set the active navigation item
   * @param id - ID of the item to set as active
   */
  setActive(id: string): void {
    try {
      // Update internal state
      this._items = this._items.map((item) => ({
        ...item,
        active: item.id === id,
      }));

      // Update DOM
      this.updateActiveItem(id);

      // Dispatch navigation event
      this.dispatchEvent(
        new CustomEvent('navigation', {
          detail: { id },
          bubbles: true,
          composed: true,
        })
      );
    } catch (error) {
      logger.error(
        'Error in NavigationElement setActive:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update the active item in the DOM
   */
  private updateActiveItem(id: string): void {
    try {
      const navItems = this._root.querySelectorAll('.nav-item');

      navItems.forEach((item) => {
        const itemId = item.getAttribute('data-id');
        if (itemId === id) {
          item.classList.add('active');
          item.setAttribute('aria-current', 'page');
        } else {
          item.classList.remove('active');
          item.removeAttribute('aria-current');
        }
      });
    } catch (error) {
      logger.error(
        'Error updating active navigation item:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle navigation item click
   */
  private handleItemClick(event: Event, id: string): void {
    try {
      event.preventDefault();
      this.setActive(id);
    } catch (error) {
      logger.error(
        'Error handling navigation item click:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Render navigation items
   */
  private renderItems(): void {
    try {
      const navList = this._root.querySelector('.nav-list');
      if (!navList) return;

      // Clear existing items
      navList.innerHTML = '';

      // Add new items
      this._items.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';
        if (item.active) {
          listItem.classList.add('active');
        }
        listItem.setAttribute('data-id', item.id);

        const link = document.createElement('a');
        link.textContent = item.label;
        link.href = item.path || `#${item.id}`;
        if (item.active) {
          link.setAttribute('aria-current', 'page');
        }

        // Add click handler
        link.addEventListener('click', (e) => this.handleItemClick(e, item.id));

        listItem.appendChild(link);
        navList.appendChild(listItem);
      });
    } catch (error) {
      logger.error(
        'Error rendering navigation items:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Render the component
   */
  private render(): void {
    try {
      // Create styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
          width: 100%;
        }
        
        .nav-container {
          background-color: ${THEME.colors.background.darker};
          border-radius: ${THEME.borderRadius.md};
          padding: ${THEME.spacing.sm} ${THEME.spacing.md};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .nav-list {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .nav-item {
          margin: 0 ${THEME.spacing.sm};
          padding: ${THEME.spacing.sm} 0;
        }
        
        .nav-item a {
          color: ${THEME.colors.text.primary};
          text-decoration: none;
          padding: ${THEME.spacing.sm} ${THEME.spacing.md};
          border-radius: ${THEME.borderRadius.sm};
          transition: all 0.2s ease;
        }
        
        .nav-item a:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: ${THEME.colors.primary};
        }
        
        .nav-item.active a {
          color: ${THEME.colors.primary};
          font-weight: bold;
          background-color: rgba(100, 108, 255, 0.1);
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .nav-list {
            flex-direction: column;
            align-items: center;
          }
          
          .nav-item {
            margin: ${THEME.spacing.xs} 0;
            width: 100%;
            text-align: center;
          }
          
          .nav-item a {
            display: block;
          }
        }
      `;

      this._root.appendChild(style);

      // Create navigation structure
      const container = document.createElement('nav');
      container.className = 'nav-container';
      container.setAttribute('aria-label', 'Main Navigation');

      const navList = document.createElement('ul');
      navList.className = 'nav-list';

      container.appendChild(navList);
      this._root.appendChild(container);

      // Render initial items if any
      if (this._items.length > 0) {
        this.renderItems();
      }
    } catch (error) {
      logger.error(
        'Error rendering navigation component:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Register the custom element
try {
  if (!customElements.get('app-navigation')) {
    customElements.define('app-navigation', NavigationElement);
  }
} catch (error) {
  logger.error(
    'Failed to register app-navigation component:',
    error instanceof Error ? error : new Error(String(error))
  );
}
