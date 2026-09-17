import { defineConfig, devices } from '@playwright/test'

const localNoProxy = ['127.0.0.1', 'localhost']
process.env.NO_PROXY = [process.env.NO_PROXY, ...localNoProxy].filter(Boolean).join(',')
process.env.no_proxy = [process.env.no_proxy, ...localNoProxy].filter(Boolean).join(',')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
