/**
 * PWA Splash Screen Component
 *
 * This component provides a custom splash screen that displays when the PWA launches
 * Features:
 * - Smooth transition when app is ready
 * - Branded loading experience
 * - Platform adaptive behavior
 */
import * as logger from '../utils/logger';

export class PWASplashScreen extends HTMLElement {
  // Time to show the splash screen in ms (minimum)
  private readonly MINIMUM_SPLASH_TIME = 1000;
  private readonly ANIMATION_DURATION = 500;
  private splashContainer: HTMLDivElement | null = null;
  private appReady = false;
  private startTime = 0;
  private readyListener: ((event: Event) => void) | null = null;
  private appInitialized = false;

  /**
   * Custom element lifecycle - when element is connected to the DOM
   */
  connectedCallback(): void {
    try {
      // Only initialize once
      if (this.appInitialized) {
        return;
      }

      this.appInitialized = true;

      // Record the start time for minimum display calculation
      this.startTime = Date.now();

      // Create the splash screen
      this.createSplashScreen();

      // Listen for app-ready event
      this.readyListener = this.handleAppReady.bind(this);
      window.addEventListener('app-ready', this.readyListener);

      // Fallback timer to hide splash after a maximum time
      // This prevents the splash from staying forever if app-ready event is never fired
      this.setupFallbackTimer();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error initializing PWA splash screen: ' + errorMsg);
      // In case of error, make sure splash doesn't stay forever
      this.hideSplashScreen();
    }
  }

  /**
   * Custom element lifecycle - when element is removed from the DOM
   */
  disconnectedCallback(): void {
    try {
      // Clean up event listeners
      if (this.readyListener) {
        window.removeEventListener('app-ready', this.readyListener);
        this.readyListener = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error cleaning up PWA splash screen: ' + errorMsg);
    }
  }

  /**
   * Create and show the splash screen
   */
  private createSplashScreen(): void {
    try {
      // Create the container
      this.splashContainer = document.createElement('div');
      this.splashContainer.className = 'pwa-splash-screen';

      // Set up styles
      this.setupStyles();

      // Create the content
      const splashContent = document.createElement('div');
      splashContent.className = 'pwa-splash-content';

      // Add logo
      const logo = document.createElement('div');
      logo.className = 'pwa-splash-logo';

      // Use actual app logo
      const logoImg = document.createElement('img');
      logoImg.src = '/pwa-512x512.png';
      logoImg.alt = 'App Logo';
      logoImg.width = 128;
      logoImg.height = 128;
      logo.appendChild(logoImg);

      splashContent.appendChild(logo);

      // Add app name
      const appName = document.createElement('h1');
      appName.className = 'pwa-splash-title';
      appName.textContent = 'Universal Number Coordinates Calculator';
      splashContent.appendChild(appName);

      // Add loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'pwa-splash-loading';
      loadingIndicator.innerHTML = '<div></div><div></div><div></div><div></div>';
      splashContent.appendChild(loadingIndicator);

      // Add content to container
      this.splashContainer.appendChild(splashContent);

      // Add to DOM
      this.appendChild(this.splashContainer);

      // Log splash screen shown
      logger.info('PWA splash screen displayed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error creating splash screen: ' + errorMsg);
    }
  }

  /**
   * Set up styles for the splash screen
   */
  private setupStyles(): void {
    try {
      const style = document.createElement('style');
      style.textContent = `
        .pwa-splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #1a73e8;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity ${this.ANIMATION_DURATION}ms ease-out;
        }
        
        .pwa-splash-content {
          text-align: center;
          padding: 20px;
          max-width: 80%;
        }
        
        .pwa-splash-logo {
          font-size: 72px;
          margin-bottom: 24px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .pwa-splash-title {
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                       Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 24px;
          margin: 0 0 30px 0;
          font-weight: 500;
        }
        
        .pwa-splash-loading {
          display: inline-flex;
          position: relative;
          width: 80px;
          height: 20px;
        }
        
        .pwa-splash-loading div {
          position: absolute;
          top: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          animation-timing-function: cubic-bezier(0, 1, 1, 0);
        }
        
        .pwa-splash-loading div:nth-child(1) {
          left: 8px;
          animation: pwa-splash-loading1 0.6s infinite;
        }
        
        .pwa-splash-loading div:nth-child(2) {
          left: 8px;
          animation: pwa-splash-loading2 0.6s infinite;
        }
        
        .pwa-splash-loading div:nth-child(3) {
          left: 32px;
          animation: pwa-splash-loading2 0.6s infinite;
        }
        
        .pwa-splash-loading div:nth-child(4) {
          left: 56px;
          animation: pwa-splash-loading3 0.6s infinite;
        }
        
        @keyframes pwa-splash-loading1 {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        
        @keyframes pwa-splash-loading3 {
          0% { transform: scale(1); }
          100% { transform: scale(0); }
        }
        
        @keyframes pwa-splash-loading2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(24px, 0); }
        }
      `;

      this.appendChild(style);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up splash screen styles: ' + errorMsg);
    }
  }

  /**
   * Handle app-ready event
   */
  private handleAppReady(_event: Event): void {
    try {
      logger.info('App ready event received');

      this.appReady = true;

      // Calculate how long we've displayed the splash
      const elapsedTime = Date.now() - this.startTime;

      // Ensure minimum display time
      if (elapsedTime < this.MINIMUM_SPLASH_TIME) {
        // If not shown long enough, wait the remaining time
        const remainingTime = this.MINIMUM_SPLASH_TIME - elapsedTime;
        setTimeout(() => this.hideSplashScreen(), remainingTime);
      } else {
        // If shown long enough, hide immediately
        this.hideSplashScreen();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling app ready event: ' + errorMsg);
      // In case of error, make sure splash doesn't stay forever
      this.hideSplashScreen();
    }
  }

  /**
   * Hide the splash screen with a fade out animation
   */
  private hideSplashScreen(): void {
    try {
      if (!this.splashContainer) {
        return;
      }

      // Fade out
      this.splashContainer.style.opacity = '0';

      // Remove after animation completes
      setTimeout(() => {
        try {
          if (this.splashContainer && this.splashContainer.parentNode) {
            this.splashContainer.parentNode.removeChild(this.splashContainer);
            this.splashContainer = null;

            // Log splash screen hidden
            logger.info('PWA splash screen hidden');
          }
        } catch (innerError) {
          const errorMsg = innerError instanceof Error ? innerError.message : String(innerError);
          logger.error('Error removing splash screen: ' + errorMsg);
        }
      }, this.ANIMATION_DURATION);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error hiding splash screen: ' + errorMsg);

      // Force removal in case of error
      if (this.splashContainer && this.splashContainer.parentNode) {
        this.splashContainer.parentNode.removeChild(this.splashContainer);
        this.splashContainer = null;
      }
    }
  }

  /**
   * Set up fallback timer to ensure splash doesn't show indefinitely
   */
  private setupFallbackTimer(): void {
    try {
      // Maximum time to show splash (ms) before forcing hide
      const MAX_SPLASH_TIME = 10000;

      setTimeout(() => {
        if (!this.appReady) {
          logger.warn('App ready event not fired after timeout, hiding splash screen');
          this.hideSplashScreen();
        }
      }, MAX_SPLASH_TIME);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting up fallback timer: ' + errorMsg);
    }
  }

  /**
   * Manually signal that the app is ready (alternative to event)
   */
  public setAppReady(): void {
    try {
      // Dispatch app-ready event
      window.dispatchEvent(new Event('app-ready'));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error setting app ready: ' + errorMsg);
      // In case of error, make sure splash doesn't stay forever
      this.hideSplashScreen();
    }
  }
}

// Define the custom element
customElements.define('pwa-splash-screen', PWASplashScreen);
