import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
      reportOnFailure: true,
      excludeNodeModules: true,
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/index.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test/**',
        '**/tests/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
