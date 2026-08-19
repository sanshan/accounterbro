import { runtimeConfig } from '@application-template/runtime-config';
import { defineConfig, devices } from '@playwright/test';

const { port: webPort } = runtimeConfig.web;
const webUrl = `http://localhost:${webPort}`;

export default defineConfig({
    testDir: './src',
    use: {
        baseURL: webUrl,
        trace: 'on-first-retry',
    },
    webServer: {
        command: `pnpm exec vite --host localhost --port ${webPort}`,
        cwd: '../web',
        url: webUrl,
        reuseExistingServer: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
