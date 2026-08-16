import { defineConfig } from "vitest/config";

// ----------------------------------------------------------------------
// Memora Backend -- vitest.config.js
// Integration tests spin up a real (in-memory) MongoDB and hit env.js's
// validation on import, so they're slower and must run serially per
// file to avoid port/env collisions -- fileParallelism off keeps that
// predictable. Unit tests have no such constraint and stay fast.
// ----------------------------------------------------------------------

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    fileParallelism: false,
    testTimeout: 20000, // mongodb-memory-server's first boot (binary download/cache) can be slow
    include: ["tests/**/*.test.js"],
  },
});