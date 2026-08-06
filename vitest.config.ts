import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Logic tests run in Node (the store falls back to an in-memory storage shim when
// `localStorage` is absent). Component tests opt into jsdom per-file with a
// `// @vitest-environment jsdom` docblock. `globals: true` lets React Testing
// Library auto-clean between tests.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
