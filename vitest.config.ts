import { defineConfig } from 'vitest/config'

// Unit tests run in Node - the store falls back to an in-memory storage shim when
// `localStorage` is absent, so no DOM is needed for the logic layer.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
