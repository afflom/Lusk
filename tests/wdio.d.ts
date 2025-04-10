// Type definitions for WebdriverIO
declare module '@wdio/globals' {
  export const browser: WebdriverIO.Browser;
  export const $: WebdriverIO.ChainablePromiseElement;
  export const $$: WebdriverIO.ChainablePromiseArray;
  export const expect: WebdriverIO.Expect;
}

// Add missing globals
declare const browser: WebdriverIO.Browser;
declare const $: WebdriverIO.ChainablePromiseElement;
declare const $$: WebdriverIO.ChainablePromiseArray;
declare const expect: WebdriverIO.Expect;

// Test hooks
declare function describe(name: string, callback: () => void): void;
declare function it(name: string, callback: () => void | Promise<void>): void;
declare function before(callback: () => void | Promise<void>): void;
declare function beforeEach(callback: () => void | Promise<void>): void;
declare function afterEach(callback: () => void | Promise<void>): void;
declare function after(callback: () => void | Promise<void>): void;

// Add to Window interface
interface Window {
  __console_errors?: string[];
  __console_warnings?: string[];
}
