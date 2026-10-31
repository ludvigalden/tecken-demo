import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    // Per-workspace cache: no race on a shared node_modules/.vitest-cache.
    cacheDir: "node_modules/.vite",
    plugins: [vue()],
});
