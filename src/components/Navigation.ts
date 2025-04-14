/**
 * Enhanced navigation component for the application
 * Provides navigation between different sections/pages
 * Supports hierarchical navigation, icons, and responsive layouts
 */
import { THEME } from '../utils/constants';
import * as logger from '../utils/logger';

/**
 * Navigation item structure
 * Adapts Route with UI-specific properties
 */
export interface NavItem {
  id: string;
  label: string;
  path?: string;
  active?: boolean;
  icon?: string;
  children?: NavItem[];
  badge?: string | number;
  disabled?: boolean;
  hasActiveChild?: boolean;
  params?: Record<string, string>;
  title?: string;
  component?: string;
  default?: boolean;
}

/**
 * Navigation view modes
 */
export enum NavMode {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  MOBILE = 'mobile',
}

/**
 * Navigation component properties
 */
export interface NavProps {
  mode?: NavMode;
  collapsible?: boolean;
  showIcons?: boolean;
  maxDepth?: number;
  expandedIds?: string[];
}

export class NavigationElement extends HTMLElement {
  private _items: NavItem[] = [];
  private _root: ShadowRoot;
  private _expandedItems: Set<string> = new Set();
  private _mode: NavMode = NavMode.HORIZONTAL;
  private _collapsible = false;
  private _showIcons = true;
  private _maxDepth = 3;

  // Observed attributes
  static get observedAttributes(): string[] {
    return ['mode', 'collapsible', 'show-icons', 'max-depth'];
  }

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

  /**
   * Set expanded item ids
   */
  set expandedItems(ids: string[]) {
    this._expandedItems = new Set(ids);
    this.updateExpandedState();
  }

  /**
   * Get expanded item ids
   */
  get expandedItems(): string[] {
    return [...this._expandedItems];
  }

  /**
   * Set navigation mode
   */
  set mode(mode: NavMode) {
    this._mode = mode;
    this.setAttribute('mode', mode);
    this.updateLayout();
  }

  /**
   * Get navigation mode
   */
  get mode(): NavMode {
    return this._mode;
  }

  /**
   * Set collapsible state
   */
  set collapsible(value: boolean) {
    this._collapsible = value;
    this.setAttribute('collapsible', String(value));
    this.updateLayout();
  }

  /**
   * Get collapsible state
   */
  get collapsible(): boolean {
    return this._collapsible;
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
      // Add responsive behavior
      this.setupResponsiveMode();

      // Enable keyboard navigation
      this.setupKeyboardNavigation();
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
      // Remove resize listener if any
      window.removeEventListener('resize', this.handleResize);
    } catch (error) {
      logger.error(
        'Error in NavigationElement disconnectedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Lifecycle: when attributes change
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    try {
      if (oldValue === newValue) return;

      switch (name) {
        case 'mode':
          this._mode = (newValue as NavMode) || NavMode.HORIZONTAL;
          this.updateLayout();
          break;
        case 'collapsible':
          this._collapsible = newValue !== null && newValue !== 'false';
          this.updateLayout();
          break;
        case 'show-icons':
          this._showIcons = newValue !== null && newValue !== 'false';
          this.updateLayout();
          break;
        case 'max-depth':
          this._maxDepth = parseInt(newValue, 10) || 3;
          this.renderItems();
          break;
      }
    } catch (error) {
      logger.error(
        'Error in NavigationElement attributeChangedCallback:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Set up responsive behavior
   */
  private setupResponsiveMode(): void {
    // Switch to mobile mode on small screens
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // Initial check
    this.handleResize();
  }

  /**
   * Set up keyboard navigation for accessibility
   */
  private setupKeyboardNavigation(): void {
    try {
      const navList = this._root.querySelector('.nav-list');
      if (!navList) return;

      navList.addEventListener('keydown', (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        const item = (keyEvent.target as HTMLElement).closest('.nav-item');
        if (!item) return;

        const navItems = Array.from(this._root.querySelectorAll('.nav-item > a:not([disabled])'));
        const index = navItems.findIndex((i) => i === keyEvent.target);

        switch (keyEvent.key) {
          case 'ArrowRight':
            if (this._mode === NavMode.HORIZONTAL) {
              if (index < navItems.length - 1) {
                (navItems[index + 1] as HTMLElement).focus();
              }
              event.preventDefault();
            }
            break;
          case 'ArrowLeft':
            if (this._mode === NavMode.HORIZONTAL) {
              if (index > 0) {
                (navItems[index - 1] as HTMLElement).focus();
              }
              event.preventDefault();
            }
            break;
          case 'ArrowDown':
            if (this._mode === NavMode.VERTICAL || this._mode === NavMode.MOBILE) {
              if (index < navItems.length - 1) {
                (navItems[index + 1] as HTMLElement).focus();
              }
              event.preventDefault();
            }
            break;
          case 'ArrowUp':
            if (this._mode === NavMode.VERTICAL || this._mode === NavMode.MOBILE) {
              if (index > 0) {
                (navItems[index - 1] as HTMLElement).focus();
              }
              event.preventDefault();
            }
            break;
          case 'Home':
            if (navItems.length > 0) {
              (navItems[0] as HTMLElement).focus();
            }
            event.preventDefault();
            break;
          case 'End':
            if (navItems.length > 0) {
              (navItems[navItems.length - 1] as HTMLElement).focus();
            }
            event.preventDefault();
            break;
        }
      });
    } catch (error) {
      logger.error(
        'Error setting up keyboard navigation:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle resize events to update the navigation mode
   */
  private handleResize(): void {
    try {
      // Check viewport width
      const mobileBreakpoint = 768; // px
      const isMobile = window.innerWidth < mobileBreakpoint;

      // Auto-switch to mobile mode
      if (isMobile && this._mode !== NavMode.MOBILE) {
        this._mode = NavMode.MOBILE;
        this.updateLayout();
      } else if (!isMobile && this._mode === NavMode.MOBILE) {
        // Switch back to horizontal (default) when viewport increases
        this._mode = NavMode.HORIZONTAL;
        this.updateLayout();
      }
    } catch (error) {
      logger.error(
        'Error handling resize:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Set the active navigation item
   * @param id - ID of the item to set as active
   */
  setActive(id: string, triggerEvent = true): void {
    try {
      // Update internal state
      this._items = this.updateItemsActiveState(this._items, id);

      // Update DOM
      this.updateActiveItem(id);

      // Expand parent items if this is a child item
      this.expandParentItems(id);

      // Dispatch navigation event only if requested (to avoid infinite loops)
      if (triggerEvent) {
        this.dispatchEvent(
          new CustomEvent('navigation', {
            detail: { id },
            bubbles: true,
            composed: true,
          })
        );
      }
    } catch (error) {
      logger.error(
        'Error in NavigationElement setActive:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update active state in items tree recursively
   */
  private updateItemsActiveState(items: NavItem[], activeId: string): NavItem[] {
    return items.map((item) => {
      const isActive = item.id === activeId;

      // Check children recursively
      let hasActiveChild = false;
      let updatedChildren: NavItem[] | undefined;

      if (item.children && item.children.length) {
        updatedChildren = this.updateItemsActiveState(item.children, activeId);
        hasActiveChild = updatedChildren.some((child) => child.active || child.hasActiveChild);
      }

      return {
        ...item,
        active: isActive,
        hasActiveChild,
        children: updatedChildren,
      };
    });
  }

  /**
   * Expand parent items of an active item
   */
  private expandParentItems(id: string): void {
    try {
      const findParentIds = (
        items: NavItem[],
        targetId: string,
        parentChain: string[] = []
      ): string[] => {
        for (const item of items) {
          if (item.id === targetId) {
            return parentChain;
          }

          if (item.children && item.children.length > 0) {
            const childPath = findParentIds(item.children, targetId, [...parentChain, item.id]);
            if (childPath.length > 0) {
              return childPath;
            }
          }
        }

        return [];
      };

      // Find parent items
      const parentIds = findParentIds(this._items, id);

      // Expand all parent items
      this._expandedItems = new Set([...this._expandedItems, ...parentIds]);

      // Update UI
      this.updateExpandedState();
    } catch (error) {
      logger.error(
        'Error expanding parent items:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update the active item in the DOM
   */
  private updateActiveItem(id: string): void {
    try {
      // Update all nav items
      const updateItems = (element: ParentNode): void => {
        const navItems = element.querySelectorAll('.nav-item');

        navItems.forEach((item) => {
          const itemId = item.getAttribute('data-id');
          const isActive = itemId === id;

          // Update item classes
          if (isActive) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
          } else {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
          }

          // Update link styles
          const link = item.querySelector('a');
          if (link) {
            if (isActive) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            } else {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
            }
          }

          // Handle children
          const childList = item.querySelector('.nav-children');
          if (childList) {
            updateItems(childList);
          }
        });
      };

      updateItems(this._root);
    } catch (error) {
      logger.error(
        'Error updating active navigation item:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Toggle expanded state of a parent item
   */
  private toggleExpanded(id: string): void {
    try {
      if (this._expandedItems.has(id)) {
        this._expandedItems.delete(id);
      } else {
        this._expandedItems.add(id);
      }

      this.updateExpandedState();
    } catch (error) {
      logger.error(
        'Error toggling expanded state:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update expanded state in the DOM
   */
  private updateExpandedState(): void {
    try {
      const parentItems = this._root.querySelectorAll('.nav-item[data-has-children="true"]');

      parentItems.forEach((item) => {
        const itemId = item.getAttribute('data-id');
        const isExpanded = itemId ? this._expandedItems.has(itemId) : false;

        // Update ARIA attributes
        item.setAttribute('aria-expanded', String(isExpanded));

        // Update child list visibility
        const childList = item.querySelector('.nav-children');
        if (childList) {
          if (isExpanded) {
            childList.removeAttribute('hidden');
            item.classList.add('expanded');
          } else {
            childList.setAttribute('hidden', '');
            item.classList.remove('expanded');
          }
        }

        // Update toggle button icons
        const toggleBtn = item.querySelector('.expand-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = isExpanded ? '−' : '+'; // Minus or plus
          toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
        }
      });
    } catch (error) {
      logger.error(
        'Error updating expanded state:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update layout based on mode
   */
  private updateLayout(): void {
    try {
      // Remove existing mode classes
      this._root.host.classList.remove('nav-horizontal', 'nav-vertical', 'nav-mobile');

      // Add class based on current mode
      switch (this._mode) {
        case NavMode.HORIZONTAL:
          this._root.host.classList.add('nav-horizontal');
          break;
        case NavMode.VERTICAL:
          this._root.host.classList.add('nav-vertical');
          break;
        case NavMode.MOBILE:
          this._root.host.classList.add('nav-mobile');
          break;
      }

      // Apply collapsible state
      if (this._collapsible) {
        this._root.host.setAttribute('collapsible', '');
      } else {
        this._root.host.removeAttribute('collapsible');
      }

      // Update icon visibility
      if (this._showIcons) {
        this._root.host.setAttribute('show-icons', '');
      } else {
        this._root.host.removeAttribute('show-icons');
      }

      // Re-render the menu items
      this.renderItems();
    } catch (error) {
      logger.error(
        'Error updating layout:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle navigation item click
   */
  private handleItemClick(event: Event, item: NavItem): void {
    try {
      event.preventDefault();

      if (item.disabled) {
        return;
      }

      // For parent items in vertical/mobile mode, toggle expansion
      if (
        item.children?.length &&
        (this._mode === NavMode.VERTICAL || this._mode === NavMode.MOBILE) &&
        this._collapsible
      ) {
        // Clicked directly on the toggle button
        if ((event.target as HTMLElement).classList.contains('expand-toggle')) {
          this.toggleExpanded(item.id);
          return;
        }
      }

      // Set active and trigger navigation
      this.setActive(item.id);
    } catch (error) {
      logger.error(
        'Error handling navigation item click:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Render navigation items recursively
   */
  private renderItems(): void {
    try {
      const navList = this._root.querySelector('.nav-list');
      if (!navList) return;

      // Clear existing items
      navList.innerHTML = '';

      // Add new items recursively
      this.renderItemsRecursive(this._items, navList as HTMLElement, 0);
    } catch (error) {
      logger.error(
        'Error rendering navigation items:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Render items recursively with support for nested menus
   */
  private renderItemsRecursive(items: NavItem[], container: HTMLElement, depth: number): void {
    try {
      // Don't exceed max depth
      if (depth > this._maxDepth) {
        return;
      }

      items.forEach((item) => {
        const hasChildren = item.children && item.children.length > 0;

        // Create list item
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';
        listItem.setAttribute('data-id', item.id);
        listItem.setAttribute('data-depth', String(depth));
        listItem.setAttribute('data-has-children', String(hasChildren));

        if (item.active) {
          listItem.classList.add('active');
        }

        if (item.disabled) {
          listItem.classList.add('disabled');
        }

        if (hasChildren) {
          const isExpanded = this._expandedItems.has(item.id);
          listItem.setAttribute('aria-expanded', String(isExpanded));
          if (isExpanded) {
            listItem.classList.add('expanded');
          }
        }

        // Create link
        const link = document.createElement('a');
        link.className = 'nav-link';
        link.href = item.path || `#${item.id}`;

        if (item.active) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }

        if (item.disabled) {
          link.setAttribute('aria-disabled', 'true');
          link.setAttribute('tabindex', '-1');
        }

        // Add icon if present and enabled
        if (item.icon && this._showIcons) {
          const icon = document.createElement('span');
          icon.className = 'nav-icon';
          icon.innerHTML = item.icon;
          icon.setAttribute('aria-hidden', 'true');
          link.appendChild(icon);
        }

        // Add label
        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = item.label;
        link.appendChild(label);

        // Add badge if present
        if (item.badge) {
          const badge = document.createElement('span');
          badge.className = 'nav-badge';
          badge.textContent = String(item.badge);
          link.appendChild(badge);
        }

        // Add expand toggle for parent items
        if (
          hasChildren &&
          this._collapsible &&
          (this._mode === NavMode.VERTICAL || this._mode === NavMode.MOBILE)
        ) {
          const toggle = document.createElement('button');
          toggle.className = 'expand-toggle';
          toggle.setAttribute(
            'aria-label',
            this._expandedItems.has(item.id) ? 'Collapse' : 'Expand'
          );
          toggle.setAttribute('type', 'button');
          toggle.textContent = this._expandedItems.has(item.id) ? '−' : '+'; // Minus or plus
          link.appendChild(toggle as Node);
        }

        // Add click handler to the entire link
        link.addEventListener('click', (e) => this.handleItemClick(e, item));
        listItem.appendChild(link);

        // Add children if any
        if (hasChildren) {
          const childList = document.createElement('ul');
          childList.className = 'nav-children';

          // Hide child list initially if collapsed
          if (!this._expandedItems.has(item.id)) {
            childList.setAttribute('hidden', '');
          }

          // Recursively render children - children exists because hasChildren is true
          if (item.children) {
            this.renderItemsRecursive(item.children, childList, depth + 1);
          }
          listItem.appendChild(childList);
        }

        container.appendChild(listItem);
      });
    } catch (error) {
      logger.error(
        'Error rendering navigation items recursively:',
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
          --nav-highlight-color: ${THEME.colors.primary};
          --nav-item-height: 2.5rem;
          --nav-background: ${THEME.colors.background.darker};
          --nav-icon-size: 1.2rem;
          --nav-badge-bg: ${THEME.colors.secondary};
          --nav-badge-color: white;
        }
        
        :host(.nav-horizontal) .nav-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        :host(.nav-vertical) .nav-list {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        
        :host(.nav-mobile) .nav-list {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        
        .nav-container {
          background-color: var(--nav-background);
          border-radius: ${THEME.borderRadius.md};
          padding: ${THEME.spacing.sm} ${THEME.spacing.md};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          max-width: 100%;
          overflow: hidden;
        }
        
        .nav-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .nav-children {
          list-style: none;
          margin: 0;
          padding-left: ${THEME.spacing.md};
        }
        
        .nav-item {
          position: relative;
        }
        
        :host(.nav-horizontal) .nav-item {
          margin: 0 ${THEME.spacing.sm};
          padding: ${THEME.spacing.sm} 0;
        }
        
        :host(.nav-vertical) .nav-item,
        :host(.nav-mobile) .nav-item {
          margin: ${THEME.spacing.xs} 0;
          width: 100%;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          color: ${THEME.colors.text.primary};
          text-decoration: none;
          padding: ${THEME.spacing.sm} ${THEME.spacing.md};
          border-radius: ${THEME.borderRadius.sm};
          transition: all 0.2s ease;
          height: var(--nav-item-height);
          box-sizing: border-box;
          position: relative;
        }
        
        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--nav-highlight-color);
        }
        
        .nav-item.active > .nav-link,
        .nav-link.active {
          color: var(--nav-highlight-color);
          font-weight: bold;
          background-color: rgba(100, 108, 255, 0.1);
        }
        
        .nav-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: ${THEME.spacing.sm};
          width: var(--nav-icon-size);
          height: var(--nav-icon-size);
        }
        
        .nav-label {
          flex: 1;
        }
        
        .nav-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.5rem;
          height: 1.5rem;
          padding: 0 0.4rem;
          border-radius: 0.75rem;
          background-color: var(--nav-badge-bg);
          color: var(--nav-badge-color);
          font-size: 0.75rem;
          font-weight: bold;
          margin-left: ${THEME.spacing.sm};
        }
        
        .nav-item[data-has-children="true"] > .nav-link {
          position: relative;
        }
        
        .expand-toggle {
          background: none;
          border: none;
          width: 1.5rem;
          height: 1.5rem;
          margin-left: ${THEME.spacing.xs};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: ${THEME.colors.text.secondary};
          border-radius: ${THEME.borderRadius.sm};
          padding: 0;
        }
        
        .expand-toggle:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--nav-highlight-color);
        }
        
        /* Item depth styling */
        .nav-item[data-depth="0"] > .nav-link {
          font-weight: 500;
        }
        
        .nav-item[data-depth="1"] > .nav-link {
          font-size: 0.95em;
        }
        
        .nav-item[data-depth="2"] > .nav-link {
          font-size: 0.9em;
        }
        
        /* Disabled state */
        .nav-item.disabled > .nav-link {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          :host .nav-list {
            flex-direction: column;
            align-items: stretch;
          }
          
          :host .nav-item {
            margin: ${THEME.spacing.xs} 0;
            width: 100%;
          }
          
          :host .nav-link {
            width: 100%;
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
      navList.setAttribute('role', 'menubar');

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
