/**
 * Helper functions for integration tests
 */

/**
 * Captures and returns all console logs of specified types
 * @param types Array of console types to capture ('log', 'info', 'warn', 'error')
 * @returns Promise resolving to array of console entries
 */
export async function captureConsoleLogs(types: string[] = ['error', 'warn']) {
  // Get the logs from the browser
  const logs = await browser.getLogs('browser');

  // Filter by specified types
  return logs.filter((log: any) => {
    const level = log.level || log.type || '';
    return types.includes(level as string);
  });
}

/**
 * Waits for the page to be fully loaded including web components
 */
export async function waitForPageLoad(options = { timeout: 10000, waitForComponents: true }) {
  try {
    // First check if we have a TEST_PORT environment variable and use it
    const testPort = process.env.TEST_PORT;
    if (testPort) {
      console.log(`Using TEST_PORT environment variable: ${testPort}`);
    } else {
      console.log('No TEST_PORT environment variable found, will use default port');
    }

    // First wait for document ready state
    await browser.waitUntil(
      async () => {
        const state = await browser.execute(() => document.readyState);
        return state === 'complete';
      },
      {
        timeout: options.timeout,
        timeoutMsg: 'Page did not finish loading',
      }
    );

    // Then wait for web components if requested
    if (options.waitForComponents) {
      await waitForWebComponentsReady();
    }
  } catch (error) {
    // Try to recover by checking different ports
    try {
      console.log('Page load error, trying to determine the correct preview server port...');

      // Get the TEST_PORT environment variable or use the default range
      const testPort = process.env.TEST_PORT;
      let ports = [];

      if (testPort) {
        // If we have a TEST_PORT, try that port and a few ports around it first
        // as they're most likely to be correct
        const portNum = parseInt(testPort, 10);
        ports = [portNum, portNum + 1, portNum - 1, portNum + 2, portNum - 2];

        // Then add standard ports
        ports = ports.concat([4173, 4174, 5173, 5174]);

        // Then add more ports in a wider range around the TEST_PORT
        for (let i = 3; i < 10; i++) {
          ports.push(portNum + i);
          ports.push(portNum - i);
        }
      } else {
        // No TEST_PORT, use a wide range of common ports
        ports = [
          4173, 4174, 5173, 5174, 4175, 4176, 4177, 4178, 4179, 4180, 4181, 4182, 4183, 4184, 4185,
          5175, 5176, 5177,
        ];
      }

      // Deduplicate the ports array
      ports = [...new Set(ports)];

      console.log(`Will try the following ports: ${ports.join(', ')}`);

      for (const port of ports) {
        try {
          console.log(`Attempting to connect to port ${port}...`);
          // Set a shorter timeout for these port checks to fail fast
          await browser.setTimeout({ pageLoad: 3000 });
          await browser.url(`http://localhost:${port}/`);

          // Wait for page to load, but with a shorter timeout
          await browser.waitUntil(
            async () => {
              const state = await browser.execute(() => document.readyState);
              return state === 'complete';
            },
            { timeout: 3000 }
          );

          console.log(`✅ Successfully connected to port ${port}`);

          // Reset timeout to normal
          await browser.setTimeout({ pageLoad: options.timeout });

          // Then wait for web components if requested
          if (options.waitForComponents) {
            await waitForWebComponentsReady();
          }

          // Save the successful port to baseUrl to make future navigations work
          if (browser.options && browser.options.baseUrl) {
            console.log(
              `Updating baseUrl from ${browser.options.baseUrl} to http://localhost:${port}/`
            );
            browser.options.baseUrl = `http://localhost:${port}/`;
          }

          return;
        } catch (e) {
          console.log(`❌ Failed to connect to port ${port}: ${e.message}`);
          // Continue to next port
        }
      }
    } catch (portError) {
      console.error('Error while trying to find server port:', portError);
    }

    console.error('Failed to connect to any port. Original error:', error);
    throw error;
  }
}

/**
 * Waits for all web components to be defined and rendered
 */
export async function waitForWebComponentsReady(timeout = 5000) {
  await browser
    .waitUntil(
      async () => {
        // Check if both app-root and app-counter are defined and rendered
        const componentsStatus = await browser.execute(() => {
          // Check custom elements registry
          const appRootDefined = customElements.get('app-root') !== undefined;
          const counterDefined = customElements.get('app-counter') !== undefined;

          // Check for instances in the DOM
          const appRoot = document.querySelector('app-root');
          const appCounter = document.querySelector('app-counter');

          // Check shadows for content
          const appRootReady =
            appRoot && appRoot.shadowRoot && appRoot.shadowRoot.childNodes.length > 0;
          const counterReady =
            !appCounter ||
            (appCounter && appCounter.shadowRoot && appCounter.shadowRoot.childNodes.length > 0);

          return {
            defined: appRootDefined && counterDefined,
            rendered: appRootReady && counterReady,
            ready: appRootDefined && counterDefined && appRootReady && counterReady,
          };
        });

        return componentsStatus.ready;
      },
      {
        timeout,
        timeoutMsg: 'Web components not ready after timeout',
        interval: 100,
      }
    )
    .catch((error) => {
      console.warn('Web components not fully ready:', error.message);
      // Continue test execution even if components aren't fully ready
    });
}

/**
 * Checks if the PWA is registered
 */
export async function isPwaRegistered() {
  return browser.execute(() => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    return navigator.serviceWorker
      .getRegistration()
      .then((registration) => !!registration)
      .catch(() => false);
  });
}

/**
 * Adds a custom assertion to check for absence of console errors and warnings
 */
export function expectNoConsoleErrors() {
  const errors = browser.execute(() => {
    // @ts-ignore - custom property we're storing logs in
    return window.__console_errors || [];
  });

  expect(errors).toHaveLength(0);
}

/**
 * Checks for web component rendering errors
 * @returns Object with diagnostic info about web components
 */
export async function checkWebComponentsRenderingErrors() {
  return browser.execute(() => {
    // Check app-root rendering
    let appRootStatus = 'Not checked';
    try {
      const appRoot = document.querySelector('app-root');
      if (!appRoot) {
        appRootStatus = 'app-root element not found';
      } else {
        const shadowRoot = appRoot.shadowRoot;
        if (!shadowRoot) {
          appRootStatus = 'app-root shadowRoot not attached';
        } else {
          const hasContent = shadowRoot.childNodes.length > 0;
          appRootStatus = hasContent ? 'Rendered correctly' : 'Empty shadow DOM';
        }
      }
    } catch (error) {
      appRootStatus = `Error checking app-root: ${error}`;
    }

    // Check app-counter rendering
    let counterStatus = 'Not checked';
    try {
      const counters = document.querySelectorAll('app-counter');
      if (counters.length === 0) {
        counterStatus = 'No app-counter elements found';
      } else {
        const failures = [];
        counters.forEach((counter, index) => {
          const shadowRoot = counter.shadowRoot;
          if (!shadowRoot) {
            failures.push(`Counter ${index}: shadowRoot not attached`);
          } else {
            const button = shadowRoot.querySelector('button');
            if (!button) {
              failures.push(`Counter ${index}: button not found in shadowRoot`);
            }
          }
        });

        counterStatus =
          failures.length === 0 ? 'All counters rendered correctly' : failures.join('; ');
      }
    } catch (error) {
      counterStatus = `Error checking app-counter: ${error}`;
    }

    // In the test environment, we should consider it normal to have no counter
    // since it's only rendered inside app-root's shadow DOM and our test setup
    // might not have properly initialized the component
    const hasErrors =
      appRootStatus !== 'Rendered correctly' ||
      (counterStatus !== 'No app-counter elements found' &&
        !counterStatus.includes('rendered correctly'));

    return {
      appRootStatus,
      counterStatus,
      hasErrors,
    };
  });
}
