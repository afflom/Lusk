import type { Options } from '@wdio/types';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Detect Chrome version from system or use fallback
function detectChromeVersion(): string {
  try {
    // Try to get Chrome version dynamically
    const chromeOutput = execSync('google-chrome --version').toString().trim();
    const versionMatch = chromeOutput.match(/Chrome\s+(\d+)/i);
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    }
  } catch (error) {
    console.warn('Could not detect Chrome version:', error);
  }

  // Fallback to environment variable or use 'auto' for auto-detection
  return process.env.CHROME_VERSION || 'auto';
}

// Get the Chrome version that matches the installed Chrome
const chromeVersion = detectChromeVersion();
console.log(`Detected Chrome version: ${chromeVersion}`);

// Get the test port from environment or use a default
const testPort = process.env.TEST_PORT;

// Get the host from environment or use a default (localhost for local, 0.0.0.0 for CI)
// In CI with GitHub Actions, needed to use localhost even though binding to 0.0.0.0
const testHost = process.env.WDIO_HOST || (process.env.CI ? 'localhost' : 'localhost');

// Log port configuration
if (testPort) {
  console.log(`Using TEST_PORT environment variable: ${testPort}`);
} else {
  console.log('No TEST_PORT specified, will use port discovery in tests');
}

console.log(`Using host for WebDriver: ${testHost}`);

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

// Configure WebdriverIO
export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.wdio.json',
      transpileOnly: true,
    },
  },
  specs: ['./tests/integration/**/*.ts'],
  exclude: [],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          '--headless',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1440,900',
        ],
      },
    },
  ],
  logLevel: 'info',
  bail: 0,
  baseUrl: `http://${testHost}:${testPort || 4173}`,
  // Use environment variables for timeouts or default values
  waitforTimeout: process.env.WDIO_WAIT_TIMEOUT
    ? parseInt(process.env.WDIO_WAIT_TIMEOUT, 10)
    : 10000,
  connectionRetryTimeout: process.env.WDIO_RETRY_TIMEOUT
    ? parseInt(process.env.WDIO_RETRY_TIMEOUT, 10)
    : 60000,
  connectionRetryCount: process.env.WDIO_RETRY_COUNT
    ? parseInt(process.env.WDIO_RETRY_COUNT, 10)
    : 3,
  services: [
    [
      'chromedriver',
      {
        logFileName: 'wdio-chromedriver.log',
        outputDir: 'logs',
        // If we have a custom path in environment, use it
        ...(process.env.CHROMEDRIVER_PATH && {
          chromedriverCustomPath: process.env.CHROMEDRIVER_PATH,
        }),
        // For CI environments, use the standard path
        ...(!process.env.CHROMEDRIVER_PATH &&
          process.env.CI && {
            chromedriverCustomPath: '/usr/bin/chromedriver',
          }),
        // For local environments, let WebdriverIO find the right driver in node_modules
        ...(!(process.env.CHROMEDRIVER_PATH || process.env.CI) && {
          chromedriverCustomPath: path.resolve('./node_modules/chromedriver/bin/chromedriver'),
        }),
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  beforeSession: function () {
    // Write test configuration to log for debugging
    fs.writeFileSync(
      'logs/test-config.log',
      JSON.stringify(
        {
          baseUrl: config.baseUrl,
          testPort: testPort || 'not set',
          chromeVersion: chromeVersion,
          timestamp: new Date().toISOString(),
          env: Object.keys(process.env)
            .filter((key) => key.startsWith('TEST_') || key.startsWith('CHROME') || key === 'PATH')
            .reduce(
              (obj, key) => {
                obj[key] = process.env[key];
                return obj;
              },
              {} as Record<string, string | undefined>
            ),
        },
        null,
        2
      )
    );
  },
  before: function () {
    // Console errors/warnings are captured in the tests using our custom mechanism
    // This is just for additional debugging during test runs
    try {
      // Log starting base URL
      console.log(`Initial baseUrl: ${browser.options.baseUrl}`);

      // @ts-expect-error - Browser event is available but not in type definitions
      browser.on('window.console' as any, (type: string, args: any) => {
        if (type === 'error' || type === 'warning') {
          // eslint-disable-next-line no-console
          console.log(`Browser console ${type}:`, args);
        }
      });
    } catch (e) {
      // Ignore if not supported
      console.warn('Failed to set up browser console listener:', e);
    }
  },
  beforeTest: function () {
    // Clear before each test
    browser.execute(() => {
      console.clear();
    });
  },
  afterTest: function (test) {
    // Save test info for debugging if needed
    fs.appendFileSync(
      'logs/test-results.log',
      `${new Date().toISOString()} - ${test.parent} - ${test.title}: ${test.passed ? 'PASSED' : 'FAILED'}\n`
    );
  },
};
