import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Default environment for component tests (src/)
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "convex/**/*.test.{ts,tsx}",
    ],
    // Convex tests run in edge-runtime; component tests run in jsdom
    environmentMatchGlobs: [
      ["convex/**/*.test.ts", "edge-runtime"],
    ],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
