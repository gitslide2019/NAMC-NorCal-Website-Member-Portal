// Playwright type declarations

declare global {
  interface Window {
    performance: {
      getEntriesByType: (type: string) => any[];
      measure: (name: string, start?: string) => void;
      mark: (name: string) => void;
    };
  }
}

declare module '@playwright/test' {
  interface Page {
    setJavaScriptEnabled?: (enabled: boolean) => Promise<void>;
  }
}

declare module 'axe-playwright' {
  export function checkA11y(page: any, context?: any, options?: any): Promise<void>;
  export function injectAxe(page: any): Promise<void>;
}

export {};