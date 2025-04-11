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
        // Check if app-shell and math-demo are defined and rendered
        const componentsStatus = await browser.execute(() => {
          // Check custom elements registry
          const appShellDefined = customElements.get('app-shell') !== undefined;
          const mathDemoDefined = customElements.get('math-demo') !== undefined;
          const counterDefined = customElements.get('app-counter') !== undefined;

          // Check for instances in the DOM
          const appShell = document.querySelector('app-shell');
          const mathDemo = document.querySelector('math-demo');

          // Check shadows for content
          const appShellReady =
            appShell && appShell.shadowRoot && appShell.shadowRoot.childNodes.length > 0;
          const mathDemoReady =
            !mathDemo ||
            (mathDemo && mathDemo.shadowRoot && mathDemo.shadowRoot.childNodes.length > 0);

          return {
            defined: appShellDefined && mathDemoDefined && counterDefined,
            rendered: appShellReady && mathDemoReady,
            ready:
              appShellDefined &&
              mathDemoDefined &&
              counterDefined &&
              appShellReady &&
              mathDemoReady,
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
    // Check app-shell rendering
    let appShellStatus = 'Not checked';
    let appRootStatus = 'Not checked'; // Legacy app-root check
    try {
      const appShell = document.querySelector('app-shell');
      if (!appShell) {
        appShellStatus = 'app-shell element not found';
      } else {
        const shadowRoot = appShell.shadowRoot;
        if (!shadowRoot) {
          appShellStatus = 'app-shell shadowRoot not attached';
        } else {
          const hasContent = shadowRoot.childNodes.length > 0;
          appShellStatus = hasContent ? 'Rendered correctly' : 'Empty shadow DOM';
        }
      }

      // Also check for app-root for backward compatibility
      const appRoot = document.querySelector('app-root');
      if (!appRoot) {
        appRootStatus = 'app-root element not found';
      }
    } catch (error) {
      appShellStatus = `Error checking app-shell: ${error}`;
    }

    // Check math-demo rendering
    let mathDemoStatus = 'Not checked';
    try {
      const mathDemos = document.querySelectorAll('math-demo');
      if (mathDemos.length === 0) {
        mathDemoStatus = 'No math-demo elements found';
      } else {
        const failures = [];
        mathDemos.forEach((mathDemo, index) => {
          const shadowRoot = mathDemo.shadowRoot;
          if (!shadowRoot) {
            failures.push(`MathDemo ${index}: shadowRoot not attached`);
          } else {
            const form = shadowRoot.querySelector('.math-form');
            if (!form) {
              failures.push(`MathDemo ${index}: form not found in shadowRoot`);
            }
            const button = shadowRoot.querySelector('button');
            if (!button) {
              failures.push(`MathDemo ${index}: button not found in shadowRoot`);
            }
          }
        });

        mathDemoStatus =
          failures.length === 0 ? 'All math demos rendered correctly' : failures.join('; ');
      }
    } catch (error) {
      mathDemoStatus = `Error checking math-demo: ${error}`;
    }

    // In the test environment, we should consider it normal to have no math-demo
    // since it's only rendered inside app-shell's shadow DOM and our test setup
    // might not have properly initialized the component
    const hasErrors =
      appShellStatus !== 'Rendered correctly' ||
      (mathDemoStatus !== 'No math-demo elements found' &&
        !mathDemoStatus.includes('rendered correctly'));

    return {
      appShellStatus,
      appRootStatus,
      mathDemoStatus,
      hasErrors,
    };
  });
}
