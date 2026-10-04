import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/modules/backoffice/tests/**/*.test.{ts,tsx}'],
    setupFiles: ['src/modules/backoffice/tests/setup.ts'],
  },
});
