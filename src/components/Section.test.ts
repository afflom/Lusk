/**
 * Tests for the SectionElement component
 */
import { expect } from 'vitest';
import './Section';
import { SectionElement } from './Section';

describe('Section Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should be defined as a custom element', () => {
    expect(customElements.get('app-section')).toBeDefined();
  });

  it('should create a proper shadow DOM with open mode', () => {
    const section = document.createElement('app-section') as SectionElement;
    container.appendChild(section);

    expect(section.shadowRoot).toBeDefined();
    expect(section.shadowRoot?.mode).toBe('open');
  });

  it('should render without a title if none provided', () => {
    const section = document.createElement('app-section') as SectionElement;
    container.appendChild(section);

    const titleElement = section.shadowRoot?.querySelector('.section-title');
    expect(titleElement).toBeFalsy();
  });

  it('should render with a title if provided', () => {
    const section = document.createElement('app-section') as SectionElement;
    section.setAttribute('title', 'Test Title');
    container.appendChild(section);

    const titleElement = section.shadowRoot?.querySelector('.section-title');
    expect(titleElement).toBeDefined();
    expect(titleElement?.textContent).toBe('Test Title');
  });

  it('should update title when attribute changes', () => {
    const section = document.createElement('app-section') as SectionElement;
    section.setAttribute('title', 'Initial Title');
    container.appendChild(section);

    let titleElement = section.shadowRoot?.querySelector('.section-title');
    expect(titleElement?.textContent).toBe('Initial Title');

    section.setAttribute('title', 'Updated Title');
    titleElement = section.shadowRoot?.querySelector('.section-title');
    expect(titleElement?.textContent).toBe('Updated Title');
  });

  it('should update ID when section-id attribute changes', () => {
    const section = document.createElement('app-section') as SectionElement;
    section.setAttribute('section-id', 'initial-id');
    container.appendChild(section);

    let containerElement = section.shadowRoot?.querySelector('.section-container');
    expect(containerElement?.id).toBe('initial-id');

    section.setAttribute('section-id', 'updated-id');
    containerElement = section.shadowRoot?.querySelector('.section-container');
    expect(containerElement?.id).toBe('updated-id');
  });

  it('should handle content projection using slots', () => {
    const section = document.createElement('app-section') as SectionElement;
    container.appendChild(section);

    const paragraph = document.createElement('p');
    paragraph.textContent = 'Projected content';
    section.appendChild(paragraph);

    const slot = section.shadowRoot?.querySelector('slot');
    expect(slot).toBeDefined();

    // Getting assigned nodes directly doesn't work in JSDOM/testing context
    // but we can verify the slot exists and the paragraph is a child
    expect(section.contains(paragraph)).toBe(true);
  });

  it('should not change if attribute value remains the same', () => {
    const section = document.createElement('app-section') as SectionElement;
    section.setAttribute('title', 'Same Title');
    container.appendChild(section);

    // Mock the updateTitle method to check if it's called
    const updateTitleSpy = vi.spyOn(section as any, 'updateTitle');

    // Setting the same value shouldn't trigger the update
    section.setAttribute('title', 'Same Title');
    expect(updateTitleSpy).not.toHaveBeenCalled();

    updateTitleSpy.mockRestore();
  });

  it('should handle errors in attributeChangedCallback', () => {
    const section = document.createElement('app-section') as SectionElement;
    container.appendChild(section);

    // Mock updateTitle to throw an error
    const updateTitleSpy = vi.spyOn(section as any, 'updateTitle').mockImplementation(() => {
      throw new Error('Test error');
    });

    // Mock console.error to prevent actual logging during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // This should call attributeChangedCallback
    section.setAttribute('title', 'Error Title');

    // The error should be caught
    expect(updateTitleSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    updateTitleSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should handle errors in connectedCallback', () => {
    const section = document.createElement('app-section') as SectionElement;

    // Mock render to throw an error
    const renderSpy = vi.spyOn(section as any, 'render').mockImplementation(() => {
      throw new Error('Test error');
    });

    // Mock console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Attach to DOM to trigger connectedCallback
    container.appendChild(section);

    // The error should be caught
    expect(renderSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    renderSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
