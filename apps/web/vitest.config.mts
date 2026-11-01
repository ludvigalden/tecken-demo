import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
    // Per-workspace cache: no race on a shared node_modules/.vitest-cache.
    cacheDir: "node_modules/.vite",
    plugins: [
        vue(),
        VueI18nPlugin({
            include: [
                fileURLToPath(new URL("./src/locales/**", import.meta.url)),
            ],
            runtimeOnly: false,
            compositionOnly: true,
        }),
    ],
    test: {
        environment: "jsdom",
    },
});
