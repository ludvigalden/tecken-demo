import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
    plugins: [
        vue(),
        VueI18nPlugin({
            // Messages are precompiled at build time: no runtime message
            // compiler ships, so the CSP never needs `unsafe-eval`.
            include: [
                fileURLToPath(new URL("./src/locales/**", import.meta.url)),
            ],
            runtimeOnly: true,
            compositionOnly: true,
            fullInstall: false,
            strictMessage: true,
            escapeHtml: true,
        }),
    ],
    build: {
        assetsInlineLimit: 0,
        modulePreload: { polyfill: false },
        sourcemap: false,
    },
    server: {
        proxy: {
            "/v1": "http://127.0.0.1:8080",
            "/media": "http://127.0.0.1:8080",
        },
    },
});
