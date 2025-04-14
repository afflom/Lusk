/**
 * Tests for the enhanced NavigationElement component
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import './Navigation';
import { NavigationElement, NavItem, NavMode } from './Navigation';

describe('NavigationElement', () => {
  let container: HTMLElement;
  let navigation: NavigationElement;
  let mockItems: NavItem[];

  beforeEach(() => {
    // Set up the container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create sample navigation items
    mockItems = [
      {
        id: 'home',
        label: 'Home',
        path: '/',
        active: true,
      },
      {
        id: 'about',
        label: 'About',
        path: '/about',
      },
      {
        id: 'products',
        label: 'Products',
        path: '/products',
        children: [
          {
            id: 'product-1',
            label: 'Product 1',
            path: '/products/1',
          },
          {
            id: 'product-2',
            label: 'Product 2',
            path: '/products/2',
          },
        ],
      },
    ];

    // Create the navigation element
    navigation = document.createElement('app-navigation') as NavigationElement;
    container.appendChild(navigation);
  });

  afterEach(() => {
    // Clean up
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should be defined as a custom element', () => {
    expect(customElements.get('app-navigation')).toBeDefined();
  });

  it('should create a shadow DOM with default styling', () => {
    expect(navigation.shadowRoot).toBeDefined();
    const style = navigation.shadowRoot?.querySelector('style');
    expect(style).toBeDefined();
    expect(style?.textContent).toContain('nav-container');
  });

  it('should render navigation items', () => {
    // Set navigation items
    navigation.items = mockItems;

    // Check if items are rendered - select only top-level items (depth=0)
    const topLevelItems = navigation.shadowRoot?.querySelectorAll('.nav-item[data-depth="0"]');
    expect(topLevelItems?.length).toBe(3); // 3 top-level items

    // Check item content
    const firstItem = topLevelItems?.[0];
    const link = firstItem?.querySelector('a');
    expect(link?.textContent).toContain('Home');
    expect(link?.getAttribute('href')).toBe('/');

    // Check that child items are also rendered
    const allItems = navigation.shadowRoot?.querySelectorAll('.nav-item');
    expect(allItems?.length).toBe(5); // 3 top-level + 2 child items
  });

  it('should mark the active item', () => {
    // Set items with 'home' as active
    navigation.items = mockItems;

    // Check if the home item has active class
    const homeItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="home"]');
    expect(homeItem?.classList.contains('active')).toBe(true);

    const homeLink = homeItem?.querySelector('a');
    expect(homeLink?.classList.contains('active')).toBe(true);
    expect(homeLink?.getAttribute('aria-current')).toBe('page');

    // Set 'about' as active
    navigation.setActive('about');

    // Check if active status is updated
    const aboutItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="about"]');
    expect(aboutItem?.classList.contains('active')).toBe(true);
    expect(homeItem?.classList.contains('active')).toBe(false);
  });

  it('should change navigation mode', () => {
    // Set initial items
    navigation.items = mockItems;

    // Default mode should be horizontal
    expect(navigation.mode).toBe(NavMode.HORIZONTAL);

    // Change to vertical mode
    navigation.mode = NavMode.VERTICAL;
    expect(navigation.mode).toBe(NavMode.VERTICAL);
    expect(navigation.shadowRoot?.host.classList.contains('nav-vertical')).toBe(true);

    // Change to mobile mode
    navigation.mode = NavMode.MOBILE;
    expect(navigation.mode).toBe(NavMode.MOBILE);
    expect(navigation.shadowRoot?.host.classList.contains('nav-mobile')).toBe(true);
  });

  it('should render nested children in collapsible mode', () => {
    // Enable collapsible mode
    navigation.collapsible = true;
    navigation.mode = NavMode.VERTICAL;
    navigation.items = mockItems;

    // Check for children
    const productsItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="products"]');
    expect(productsItem?.getAttribute('data-has-children')).toBe('true');

    // Children should initially be hidden
    const childrenList = productsItem?.querySelector('.nav-children');
    expect(childrenList?.hasAttribute('hidden')).toBe(true);

    // Simulate expanding children by setting expanded items
    navigation.expandedItems = ['products'];

    // Children should now be visible
    expect(childrenList?.hasAttribute('hidden')).toBe(false);
    expect(productsItem?.classList.contains('expanded')).toBe(true);
    expect(productsItem?.getAttribute('aria-expanded')).toBe('true');

    // Check child items are rendered
    const childItems = childrenList?.querySelectorAll('.nav-item');
    expect(childItems?.length).toBe(2);
  });

  it('should dispatch navigation event when item is activated', () => {
    // Set up items
    navigation.items = mockItems;

    // Create spy for the navigation event
    const dispatchEventSpy = vi.spyOn(navigation, 'dispatchEvent');

    // Activate an item
    navigation.setActive('about');

    // Check event was dispatched with correct data
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'navigation',
        detail: { id: 'about' },
        bubbles: true,
        composed: true,
      })
    );
  });

  it('should support items with icons', () => {
    // Create items with icons
    const itemsWithIcons: NavItem[] = [
      {
        id: 'home',
        label: 'Home',
        path: '/',
        icon: '<svg width="16" height="16"><circle cx="8" cy="8" r="8" /></svg>',
      },
    ];

    // Enable icon display and set items
    navigation.showIcons = true;
    navigation.items = itemsWithIcons;

    // Check if icon is rendered
    const iconElement = navigation.shadowRoot?.querySelector('.nav-icon');
    expect(iconElement).toBeDefined();
    expect(iconElement?.innerHTML).toContain('<svg');
  });

  it('should handle attribute changes', () => {
    // Set items first
    navigation.items = mockItems;

    // Use attribute changes to update settings
    navigation.setAttribute('mode', 'vertical');
    expect(navigation.mode).toBe(NavMode.VERTICAL);

    navigation.setAttribute('collapsible', 'true');
    expect(navigation.collapsible).toBe(true);

    navigation.setAttribute('show-icons', 'false');
    expect(navigation.shadowRoot?.host.hasAttribute('show-icons')).toBe(false);

    navigation.setAttribute('max-depth', '2');
    expect(navigation._maxDepth).toBe(2);
  });

  it('should handle item click', () => {
    // Create a spy on setActive method
    const setActiveSpy = vi.spyOn(navigation, 'setActive');

    // Set items
    navigation.items = mockItems;

    // Find a link
    const aboutLink = navigation.shadowRoot?.querySelector(
      '.nav-item[data-id="about"] a'
    ) as HTMLElement;
    expect(aboutLink).toBeDefined();

    // Simulate click
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    // Mock preventDefault for the event
    Object.defineProperty(clickEvent, 'preventDefault', {
      value: vi.fn(),
    });

    // Dispatch click
    aboutLink.dispatchEvent(clickEvent);

    // Check that setActive was called
    expect(setActiveSpy).toHaveBeenCalledWith('about');
    expect(clickEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle toggling expanded state', () => {
    // Set up in vertical mode with collapsible enabled
    navigation.mode = NavMode.VERTICAL;
    navigation.collapsible = true;
    navigation.items = mockItems;

    // Initially, products should not be expanded
    let productsItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="products"]');
    expect(productsItem?.getAttribute('aria-expanded')).toBe('false');

    // Manually access the private toggleExpanded method
    // @ts-expect-error - accessing private method for testing
    navigation.toggleExpanded('products');

    // Products should now be expanded
    expect(navigation.expandedItems).toContain('products');
    productsItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="products"]');
    expect(productsItem?.getAttribute('aria-expanded')).toBe('true');

    // Toggle again to collapse
    // @ts-expect-error - accessing private method for testing
    navigation.toggleExpanded('products');

    // Products should now be collapsed
    expect(navigation.expandedItems).not.toContain('products');
    productsItem = navigation.shadowRoot?.querySelector('.nav-item[data-id="products"]');
    expect(productsItem?.getAttribute('aria-expanded')).toBe('false');
  });
});
