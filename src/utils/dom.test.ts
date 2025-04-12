import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElement, appendElement, getOrCreateElement, createNotification } from './dom';

// Run a simplified version of the DOM tests to test our testing framework
describe('DOM Utilities', () => {
  // Clear DOM after each test
  afterEach(() => {
    document.body.innerHTML = '';

    // Remove notification container if exists
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
      notificationContainer.remove();
    }

    // Remove any styles added
    document.querySelectorAll('style').forEach((style) => {
      if (style.textContent?.includes('notification-container')) {
        style.remove();
      }
    });
  });

  describe('createElement', () => {
    it('should create an element with the specified tag', () => {
      const element = createElement('div');
      expect(element.tagName).toBe('DIV');
    });

    it('should set attributes on the element', () => {
      const element = createElement('div', { id: 'test-id', class: 'test-class' });
      expect(element.getAttribute('id')).toBe('test-id');
      expect(element.getAttribute('class')).toBe('test-class');
    });

    it('should add text children', () => {
      const element = createElement('div', {}, ['Hello', 'World']);
      expect(element.childNodes.length).toBe(2);
      expect(element.textContent).toBe('HelloWorld');
    });

    it('should add element children', () => {
      const childSpan = document.createElement('span');
      const element = createElement('div', {}, [childSpan]);
      expect(element.childNodes.length).toBe(1);
      expect(element.firstChild).toBe(childSpan);
    });

    it('should handle mixed children types', () => {
      const childSpan = document.createElement('span');
      const element = createElement('div', {}, ['Hello', childSpan, 'World']);
      expect(element.childNodes.length).toBe(3);
      expect(element.childNodes[0].textContent).toBe('Hello');
      expect(element.childNodes[1]).toBe(childSpan);
      expect(element.childNodes[2].textContent).toBe('World');
    });
  });

  describe('appendElement', () => {
    it('should append element to parent by selector', () => {
      // Create parent
      const parent = document.createElement('div');
      parent.id = 'parent';
      document.body.appendChild(parent);

      // Create child
      const child = document.createElement('span');

      // Append
      appendElement('#parent', child);

      expect(parent.childNodes.length).toBe(1);
      expect(parent.firstChild).toBe(child);
    });

    it('should append element to parent element directly', () => {
      // Create parent
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      // Create child
      const child = document.createElement('span');

      // Append
      appendElement(parent, child);

      expect(parent.childNodes.length).toBe(1);
      expect(parent.firstChild).toBe(child);
    });

    it('should throw error if parent selector not found', () => {
      const child = document.createElement('span');
      expect(() => appendElement('#non-existent', child)).toThrow();
    });
  });

  describe('getOrCreateElement', () => {
    it('should return existing element if found', () => {
      // Create element
      const existing = document.createElement('div');
      existing.id = 'existing';
      document.body.appendChild(existing);

      // Should find existing element
      const createFn = (): HTMLDivElement => createElement('div', { id: 'new' });
      const result = getOrCreateElement('#existing', createFn);

      expect(result).toBe(existing);
      expect(document.querySelectorAll('div').length).toBe(1);
    });

    it('should create new element if not found', () => {
      // Create function
      const createFn = (): HTMLDivElement => createElement('div', { id: 'new' });
      const result = getOrCreateElement('#non-existent', createFn);

      expect(result.id).toBe('new');
      expect(document.body.contains(result)).toBe(true);
    });
  });

  describe('createNotification', () => {
    it('should create a notification with the specified message', () => {
      const notification = createNotification('Test message');

      const container = document.getElementById('notification-container');
      expect(container).not.toBeNull();
      expect(notification.querySelector('.notification-message')?.innerHTML).toBe('Test message');
    });

    it('should create a notification with the specified type', () => {
      const notification = createNotification('Success message', { type: 'success' });
      expect(notification.classList.contains('success')).toBe(true);

      const errorNotification = createNotification('Error message', { type: 'error' });
      expect(errorNotification.classList.contains('error')).toBe(true);
    });

    it('should create a notification with custom ID', () => {
      const notification = createNotification('Test message', { id: 'custom-notification' });
      expect(notification.id).toBe('custom-notification');
    });

    it('should auto-close notification after specified time', () => {
      vi.useFakeTimers();

      const notification = createNotification('Test message', { closeAfterMs: 1000 });
      expect(document.getElementById(notification.id)).not.toBeNull();

      vi.advanceTimersByTime(1100);

      // Give time for the animation event to fire
      document.getElementById(notification.id)?.dispatchEvent(new Event('animationend'));

      expect(document.getElementById(notification.id)).toBeNull();

      vi.useRealTimers();
    });

    it('should not auto-close when autoClose is false', () => {
      vi.useFakeTimers();

      const notification = createNotification('Test message', {
        autoClose: false,
        closeAfterMs: 1000,
      });

      vi.advanceTimersByTime(2000);
      expect(document.getElementById(notification.id)).not.toBeNull();

      vi.useRealTimers();
    });

    it('should close when the close button is clicked', () => {
      const notification = createNotification('Test message', { autoClose: false });
      const closeButton = notification.querySelector('.notification-close') as HTMLElement;

      // Simulate click
      closeButton.click();

      // To test removal that happens after animation, trigger animationend event
      notification.dispatchEvent(new Event('animationend'));

      expect(document.getElementById(notification.id)).toBeNull();
    });

    it('should support HTML content in the message', () => {
      const htmlMessage = 'Message with <strong>bold</strong> text and <a href="#">link</a>';
      const notification = createNotification(htmlMessage);

      const messageEl = notification.querySelector('.notification-message') as HTMLElement;
      expect(messageEl.innerHTML).toBe(htmlMessage);
      expect(messageEl.querySelector('strong')).not.toBeNull();
      expect(messageEl.querySelector('a')).not.toBeNull();
    });
  });
});
