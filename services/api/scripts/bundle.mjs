// Bundles the Node server into one ESM file (dist/server.mjs). Used by the
// Dockerfile build stage and by local smoke runs.
// Usage: node services/api/scripts/bundle.mjs
import { join } from "node:path";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..");

await build({
    entryPoints: [join(root, "src/server.ts")],
    outfile: join(root, "dist/server.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    // Some CommonJS dependencies call require(); give the ESM bundle one.
    banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
    },
    legalComments: "linked",
    logLevel: "info",
});
