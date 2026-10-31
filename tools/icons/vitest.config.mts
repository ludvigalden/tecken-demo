import { defineConfig } from "vitest/config";

// Each workspace keeps its own Vite/Vitest cache, so parallel `lerna run test`
// tasks never race on a shared node_modules/.vitest-cache directory.
export default defineConfig({
    cacheDir: "node_modules/.vite",
});
