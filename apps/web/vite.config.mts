import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { fileURLToPath } from "node:url";

const COMPRESSIBLE = /\.(?:js|css|html|svg|json)$/u;

/**
 * Writes `.br` and `.gz` siblings for every text asset after the build. The
 * Node server serves them (serveStatic `precompressed`) to clients that
 * accept them, so no compression runs per request.
 */
function precompress(): Plugin {
    return {
        name: "tecken-precompress",
        apply: "build",
        writeBundle(options) {
            const outDir = options.dir ?? "dist";
            const files = readdirSync(outDir, {
                recursive: true,
                encoding: "utf8",
            });
            for (const file of files.filter((f) => COMPRESSIBLE.test(f))) {
                const path = join(outDir, file);
                const body = readFileSync(path);
                writeFileSync(
                    `${path}.br`,
                    brotliCompressSync(body, {
                        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
                    }),
                );
                writeFileSync(`${path}.gz`, gzipSync(body, { level: 9 }));
            }
        },
    };
}

export default defineConfig({
    plugins: [
        vue(),
        precompress(),
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
