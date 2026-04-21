import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/main/**/*.js'],
      exclude: ['src/main/index.js'], // app lifecycle — not unit-testable
    },
  },
})
