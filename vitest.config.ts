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
      // A second `browser` project joins this list once there are enough instruments to
      // compare — it is the only way to answer the questions that actually matter about
      // synthesised audio (is one voice ten times louder than another, does an envelope ever
      // reach silence, does an exponential ramp throw), because those need a real
      // OfflineAudioContext to render. Deliberately not paid for yet: it costs a Chromium
      // download in CI, and there is nothing to measure until the patches exist.
      //
      //   {
      //     test: {
      //       name: 'browser',
      //       include: ['src/**/*.browser.test.ts'],
      //       browser: { enabled: true, provider: playwright(), headless: true,
      //                  instances: [{ browser: 'chromium' }] },
      //     },
      //   },
    ],
  },
})
