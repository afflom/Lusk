/**
 * PWA Install Prompt Component
 *
 * This component provides a customized installation experience for the PWA
 * Features:
 * - Custom "Add to Home Screen" button
 * - Installation instructions based on device/browser
 * - Installation analytics tracking
 * - Remembers user preferences with localStorage
 */
import * as logger from '../utils/logger';
import { createNotification } from '../utils/dom';

// Define the BeforeInstallPromptEvent interface
// This is a non-standard event that isn't in the TypeScript DOM lib
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export class PWAInstallPrompt extends HTMLElement {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installButton: HTMLButtonElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private promptContainer: HTMLDivElement | null = null;
  private promptShown = false;
  private installEventListenerAdded = false;
  private analyticsEventSent = false;
  private dismissedTimestamp: number | null = null;
  private readonly DISMISSED_STORAGE_KEY = 'pwa-install-prompt-dismissed';
  private readonly DISMISS_DURATION_DAYS = 7; // Don't show again for 7 days if dismissed

  /**
   * Custom element lifecycle - when element is connected to the DOM
   */
  connectedCallback(): void {
    try {
      this.init();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error initializing PWA install prompt: ' + errorMsg);
    }
  }

  /**
   * Initialize the component
   */
  private init(): void {
    // Don't initialize if already initialized or running in standalone mode
    if (this.installEventListenerAdded || this.isStandalone()) {
      return;
    }

    // Check for dismissed timestamp
    this.loadDismissedState();

    if (this.shouldShowPrompt()) {
      // Capture the deferred prompt event
      window.addEventListener('beforeinstallprompt', ((e: Event) => {
        this.handleBeforeInstallPrompt(e as BeforeInstallPromptEvent);
      }) as EventListener);

      // Track successful installations
      window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));

      this.installEventListenerAdded = true;

      // Show the prompt if it was already triggered before we added the listener
      if (this.deferredPrompt) {
        this.showInstallPrompt();
      }
    }
  }

  /**
   * Check if the app is running in standalone mode (already installed)
   */
  private isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    );
  }

  /**
   * Handle the beforeinstallprompt event
   * This event is fired when the PWA is installable
   */
  private handleBeforeInstallPrompt(event: BeforeInstallPromptEvent): void {
    try {
      // Prevent the default browser prompt
      event.preventDefault();

      // Store the event for later use
      this.deferredPrompt = event;

      // Log supported platforms (useful for debugging across browsers)
      logger.info('Install prompt platforms: ' + event.platforms.join(', '));

      // Show our custom install prompt
      if (this.shouldShowPrompt()) {
        this.showInstallPrompt();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling beforeinstallprompt event: ' + errorMsg);
    }
  }

  /**
   * Handle the appinstalled event
   * This event is fired when the PWA is successfully installed
   */
  private handleAppInstalled(): void {
    try {
      logger.info('App was successfully installed');

      // Track installation
      this.trackInstallEvent('installed');

      // Show a success message
      createNotification(
        'Successfully installed! You can now access this app from your home screen.',
        {
          type: 'success',
          autoClose: true,
          closeAfterMs: 5000,
        }
      );

      // Hide the prompt if it's still showing
      this.hideInstallPrompt();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling appinstalled event: ' + errorMsg);
    }
  }

  /**
   * Track PWA installation events for analytics
   */
  private trackInstallEvent(action: 'prompted' | 'accepted' | 'dismissed' | 'installed'): void {
    try {
      // If we've already sent this particular analytics event, don't send again
      if (action === 'prompted' && this.analyticsEventSent) {
        return;
      }

      // Use the analytics module to track installation events
      import('../utils/pwa-analytics')
        .then((analytics) => {
          analytics.trackInstallEvent(
            action === 'prompted'
              ? analytics.InstallEvent.PROMPT_SHOWN
              : action === 'accepted'
                ? analytics.InstallEvent.PROMPT_ACCEPTED
                : action === 'dismissed'
                  ? analytics.InstallEvent.PROMPT_DISMISSED
                  : analytics.InstallEvent.INSTALLED
          );
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error('Failed to load analytics module: ' + errorMsg);
          // Fallback to basic logging
          logger.info(`PWA install event tracked: ${action}`);
        });

      // Mark as sent for 'prompted' event to avoid duplicates
      if (action === 'prompted') {
        this.analyticsEventSent = true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error tracking install event: ' + errorMsg);
    }
  }

  /**
   * Show the custom install prompt
   */
  private showInstallPrompt(): void {
    if (this.promptShown || !this.shouldShowPrompt()) {
      return;
    }

    try {
      // Create the prompt UI if it doesn't exist
      if (!this.promptContainer) {
        this.createPromptUI();
      }

      // Show the prompt
      if (this.promptContainer) {
        this.promptContainer.style.display = 'flex';
        this.promptShown = true;

        // Track that we showed the prompt
        this.trackInstallEvent('prompted');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error showing install prompt: ' + errorMsg);
    }
  }

  /**
   * Hide the install prompt
   */
  private hideInstallPrompt(): void {
    if (!this.promptShown || !this.promptContainer) {
      return;
    }

    try {
      this.promptContainer.style.display = 'none';
      this.promptShown = false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error hiding install prompt: ' + errorMsg);
    }
  }

  /**
   * Create the prompt UI elements
   */
  private createPromptUI(): void {
    try {
      // Create the container
      this.promptContainer = document.createElement('div');
      this.promptContainer.className = 'pwa-install-prompt';
      this.promptContainer.style.display = 'none';

      // Set up the styles
      this.setupStyles();

      // Create the content based on the platform
      const content = this.createPlatformSpecificContent();
      this.promptContainer.appendChild(content);

      // Create the buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'pwa-install-prompt-buttons';

      // Create the install button
      this.installButton = document.createElement('button');
      this.installButton.className = 'pwa-install-button';
      this.installButton.textContent = 'Install App';
      this.installButton.addEventListener('click', this.handleInstallClick.bind(this));

      // Create the close button
      this.closeButton = document.createElement('button');
      this.closeButton.className = 'pwa-install-close-button';
      this.closeButton.textContent = 'Not Now';
      this.closeButton.addEventListener('click', this.handleCloseClick.bind(this));

      // Add buttons to the container
      buttonsContainer.appendChild(this.installButton);
      buttonsContainer.appendChild(this.closeButton);

      // Add buttons container to the prompt
      this.promptContainer.appendChild(buttonsContainer);

      // Add the prompt to the component
      this.appendChild(this.promptContainer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error creating prompt UI: ' + errorMsg);
    }
  }

  /**
   * Set up the styles for the prompt
   */
  private setupStyles(): void {
    try {
      const style = document.createElement('style');
      style.textContent = `
        .pwa-install-prompt {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: #fff;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          padding: 16px;
          display: flex;
          flex-direction: column;
          z-index: 9999;
          border-top: 4px solid #1a73e8;
          animation: pwa-slide-up 0.3s forwards;
        }
        
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .pwa-install-prompt-content {
          margin-bottom: 16px;
        }
        
        .pwa-install-prompt-title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 8px 0;
          color: #1a73e8;
        }
        
        .pwa-install-prompt-description {
          font-size: 14px;
          margin: 0 0 16px 0;
          color: #5f6368;
        }
        
        .pwa-install-steps {
          font-size: 14px;
          margin: 0;
          padding-left: 24px;
        }
        
        .pwa-install-prompt-buttons {
          display: flex;
          justify-content: flex-end;
        }
        
        .pwa-install-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          margin-left: 8px;
        }
        
        .pwa-install-button:hover {
          background-color: #1765cc;
        }
        
        .pwa-install-close-button {
          background-color: transparent;
          color: #5f6368;
          border: 1px solid #dadce0;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .pwa-install-close-button:hover {
          background-color: #f1f3f4;
        }
        
        .pwa-install-icon {
          font-size: 24px;
          margin-right: 12px;
        }
        
        .pwa-install-prompt-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        
        @media (min-width: 768px) {
          .pwa-install-prompt {
            max-width: 600px;
            left: 50%;
            transform: translateX(-50%);
            border-radius: 8px 8px 0 0;
          }
        }
      `;

      this.appendChild(style);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up styles: ' + errorMsg);
    }
  }

  /**
   * Create platform-specific content for the install prompt
   */
  private createPlatformSpecificContent(): HTMLDivElement {
    try {
      const content = document.createElement('div');
      content.className = 'pwa-install-prompt-content';

      // Create the header with icon
      const header = document.createElement('div');
      header.className = 'pwa-install-prompt-header';

      const icon = document.createElement('img');
      icon.className = 'pwa-install-icon';
      icon.src = '/pwa-192x192.png';
      icon.alt = 'App Icon';
      icon.width = 24;
      icon.height = 24;

      const title = document.createElement('h3');
      title.className = 'pwa-install-prompt-title';
      title.textContent = 'Install Universal Number Coordinates Calculator';

      header.appendChild(icon);
      header.appendChild(title);
      content.appendChild(header);

      // Description
      const description = document.createElement('p');
      description.className = 'pwa-install-prompt-description';
      description.textContent =
        'Install this app on your device for quick access even when offline.';
      content.appendChild(description);

      // Platform-specific instructions
      const steps = document.createElement('ul');
      steps.className = 'pwa-install-steps';

      // Detect platform and provide appropriate instructions
      const platform = this.detectPlatform();
      const instructions = this.getInstructionsForPlatform(platform);

      instructions.forEach((instruction) => {
        const step = document.createElement('li');
        step.textContent = instruction;
        steps.appendChild(step);
      });

      content.appendChild(steps);

      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error creating platform-specific content: ' + errorMsg);

      // Fallback content
      const fallback = document.createElement('div');
      fallback.textContent = 'Install this app on your device for better experience.';
      return fallback;
    }
  }

  /**
   * Detect the user's platform
   */
  private detectPlatform(): 'ios' | 'chrome' | 'firefox' | 'opera' | 'edge' | 'samsung' | 'other' {
    const ua = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      return 'ios';
    } else if (/chrome/.test(ua) && !/edg/.test(ua)) {
      return 'chrome';
    } else if (/firefox/.test(ua)) {
      return 'firefox';
    } else if (/opr|opera/.test(ua)) {
      return 'opera';
    } else if (/edg/.test(ua)) {
      return 'edge';
    } else if (/samsung/.test(ua)) {
      return 'samsung';
    } else {
      return 'other';
    }
  }

  /**
   * Get installation instructions for a specific platform
   */
  private getInstructionsForPlatform(
    platform: 'ios' | 'chrome' | 'firefox' | 'opera' | 'edge' | 'samsung' | 'other'
  ): string[] {
    switch (platform) {
      case 'ios':
        return [
          'Tap the share button at the bottom of the screen.',
          'Scroll down and tap "Add to Home Screen".',
          'Tap "Add" in the top right corner.',
        ];
      case 'chrome':
        return [
          'Click the "Install App" button below.',
          'Confirm by clicking "Install" in the popup.',
        ];
      case 'firefox':
        return [
          'Click the "Install App" button below or use the address bar options.',
          'Click "Install" in the confirmation dialog.',
        ];
      case 'opera':
        return [
          'Click the "Install App" button below or use the "Add to Home screen" option.',
          'Follow the on-screen instructions to install.',
        ];
      case 'edge':
        return [
          'Click the "Install App" button below or use the menu (...).',
          'Select "Apps" and then "Install this site as an app".',
        ];
      case 'samsung':
        return [
          'Tap the menu button (three dots) in the upper right.',
          'Tap "Add page to" and then "Home screen".',
        ];
      default:
        return [
          'Click the "Install App" button below.',
          'If that doesn\'t work, check your browser\'s menu for an "Install" or "Add to Home Screen" option.',
        ];
    }
  }

  /**
   * Handle the install button click
   */
  private handleInstallClick(): void {
    try {
      if (!this.deferredPrompt) {
        logger.warn('Install prompt not available');
        return;
      }

      // Show the browser's install prompt
      void this.deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      void this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          logger.info('User accepted the install prompt');
          this.trackInstallEvent('accepted');
        } else {
          logger.info('User dismissed the install prompt');
          this.trackInstallEvent('dismissed');
          this.saveDismissedState();
        }

        // Clear the deferred prompt variable as it can only be used once
        this.deferredPrompt = null;

        // Hide our custom prompt
        this.hideInstallPrompt();
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling install click: ' + errorMsg);
    }
  }

  /**
   * Handle the close button click
   */
  private handleCloseClick(): void {
    try {
      this.hideInstallPrompt();
      this.trackInstallEvent('dismissed');
      this.saveDismissedState();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling close click: ' + errorMsg);
    }
  }

  /**
   * Save the dismissed state to localStorage
   */
  private saveDismissedState(): void {
    try {
      this.dismissedTimestamp = Date.now();
      localStorage.setItem(this.DISMISSED_STORAGE_KEY, String(this.dismissedTimestamp));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error saving dismissed state: ' + errorMsg);
    }
  }

  /**
   * Load the dismissed state from localStorage
   */
  private loadDismissedState(): void {
    try {
      const storedTimestamp = localStorage.getItem(this.DISMISSED_STORAGE_KEY);
      if (storedTimestamp) {
        this.dismissedTimestamp = parseInt(storedTimestamp, 10);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error loading dismissed state: ' + errorMsg);
    }
  }

  /**
   * Check if we should show the prompt based on dismissed state
   */
  private shouldShowPrompt(): boolean {
    if (this.isStandalone()) {
      return false;
    }

    if (!this.dismissedTimestamp) {
      return true;
    }

    const dismissDurationMs = this.DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const hasExpired = Date.now() - this.dismissedTimestamp > dismissDurationMs;

    return hasExpired;
  }
}

// Define the custom element
customElements.define('pwa-install-prompt', PWAInstallPrompt);
