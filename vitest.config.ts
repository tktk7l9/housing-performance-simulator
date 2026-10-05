import { defineConfig } from "vitest/config";
import path from "node:path";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/test-setup.ts",
      ],
      reporter: ["text", "json-summary"],
      // Measured 99.0 / 93.2 / 99.8 / 99.5 over three runs; the gate sits two points below.
      thresholds: { statements: 97, branches: 91, functions: 97, lines: 97 },
    },
  },
});
