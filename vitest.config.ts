import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // Given explicitly. Vitest only reports files a test actually loaded, so without this
      // an entirely untested module is invisible rather than red — which makes the number
      // flattering in exactly the case you want it to be alarming.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', 'src/main.tsx'],
      reporter: ['text-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
    },
    projects: [
      {
        test: {
          name: 'node',
          include: ['src/**/*.test.{ts,tsx}', '*.test.ts'],
          // `.browser.test.ts` matches the include above, so this exclude is the only thing
          // keeping the two apart. See the note below.
          exclude: ['**/node_modules/**', '**/dist/**', '**/*.browser.test.*'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          // Real Chromium, because these are the questions that cannot be answered anywhere
          // else: is a voice audible, is it clipping, is one instrument ten times louder than
          // another, does an envelope ever reach silence. All of those are numbers once the
          // graph has been rendered, and only an OfflineAudioContext can render it.
          //
          // Note the `exclude` on the node project above — `.browser.test.ts` matches its
          // include pattern too, and that exclude is the only thing keeping them apart.
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: { executablePath: process.env.TUNEUP_CHROMIUM },
            }),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
