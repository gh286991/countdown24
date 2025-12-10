import { defineConfig } from 'cypress';

const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:4000';

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    setupNodeEvents(on, config) {
      // Disable GPU-backed features to avoid Chromium crashes on some hosts.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--disable-software-rasterizer');
        }
        return launchOptions;
      });
      return config;
    },
    env: {
      apiUrl: process.env.CYPRESS_API_URL || '/api',
    },
  },
});
