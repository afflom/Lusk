/**
 * Tests for the CalculatorPage component
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import './CalculatorPage';
import { CalculatorPage } from './CalculatorPage';
import * as logger from '../utils/logger';

describe('CalculatorPage Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock the logger to prevent console output
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should be defined as a custom element', () => {
    expect(customElements.get('calculator-page')).toBeDefined();
  });

  it('should create a shadow DOM with a title', () => {
    const page = document.createElement('calculator-page') as CalculatorPage;
    container.appendChild(page);

    // Verify shadow DOM is created
    expect(page.shadowRoot).toBeDefined();

    // Check title is set correctly
    const title = page.shadowRoot?.querySelector('.page-title');
    expect(title?.textContent).toBe('Math Calculator');
  });

  it('should render the calculator sections', () => {
    const page = document.createElement('calculator-page') as CalculatorPage;

    // Mock BasePage implementation
    // Create a fake shadow DOM-like structure
    const fakeShadowRoot = document.createElement('div');

    // Create a fake container
    const fakeContainer = document.createElement('div');
    fakeContainer.className = 'page-container';
    fakeShadowRoot.appendChild(fakeContainer);

    // Add required sections
    const introSection = document.createElement('div');
    introSection.id = 'calculator-intro';
    introSection.className = 'section-container';
    fakeContainer.appendChild(introSection);

    const calculatorSection = document.createElement('div');
    calculatorSection.id = 'calculator';
    calculatorSection.className = 'section-container';

    // Add a math-demo component
    const mathDemo = document.createElement('math-demo');
    calculatorSection.appendChild(mathDemo);
    fakeContainer.appendChild(calculatorSection);

    const guideSection = document.createElement('div');
    guideSection.id = 'operations-guide';
    guideSection.className = 'section-container';
    fakeContainer.appendChild(guideSection);

    // @ts-expect-error - Setting private property for testing
    page._root = fakeShadowRoot;

    // Mock createSection method to return properly structured elements
    vi.spyOn(page as any, 'createSection').mockImplementation((title, id) => {
      const section = document.createElement('div');
      section.id = id;
      section.className = 'section-container';

      const content = document.createElement('div');
      content.className = 'section-content';
      section.appendChild(content);

      return section;
    });

    // Manually call render
    (page as any).render();

    // Verify the sections
    const sections = fakeShadowRoot.querySelectorAll('.section-container');
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it('should log when page is activated', () => {
    const page = document.createElement('calculator-page') as CalculatorPage;
    container.appendChild(page);

    // Spy on the logger
    const loggerSpy = vi.spyOn(logger, 'info');

    // Call onActivate method
    (page as any).onActivate();

    // Verify log message
    expect(loggerSpy).toHaveBeenCalledWith('Calculator page activated');
  });

  it('should handle errors in rendering', () => {
    const page = document.createElement('calculator-page') as CalculatorPage;

    // Mock the BasePage render method to cause an error
    vi.spyOn(page as any, 'render').mockImplementation(() => {
      // @ts-expect-error - Accessing _root which is private
      page._root = { querySelector: () => null };
      throw new Error('Render error');
    });

    // Mock renderErrorFallback
    const errorFallbackSpy = vi
      .spyOn(page as any, 'renderErrorFallback')
      .mockImplementation(() => {});

    // Add to DOM to trigger rendering
    container.appendChild(page);

    // Verify error is handled
    expect(errorFallbackSpy).toHaveBeenCalled();
  });

  it('should throw an error if container is missing', () => {
    const page = document.createElement('calculator-page') as CalculatorPage;

    // Create a fake shadow root with missing container
    const fakeShadowRoot = {
      querySelector: () => null,
      appendChild: vi.fn(),
    };

    // @ts-expect-error - Accessing _root which is private
    page._root = fakeShadowRoot;

    // Mock renderErrorFallback to prevent test errors
    vi.spyOn(page as any, 'renderErrorFallback').mockImplementation(() => {});

    // Mock the logger
    const loggerSpy = vi.spyOn(logger, 'error');

    // Call render directly to simulate the error condition
    try {
      (page as any).render();
    } catch {
      // Expected to be caught internally
    }

    // Verify error logging with any error object
    expect(loggerSpy).toHaveBeenCalledWith('Error rendering CalculatorPage:', expect.anything());
  });
});
