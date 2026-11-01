// Bundles the Node server into one ESM file (dist/server.mjs) and prebuilds
// the validated content index next to it (dist/content-index.json), so the
// server does no content work at startup. Used by the Dockerfile build stage
// and by local and CI test runs.
// Usage: node services/api/scripts/bundle.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..");
const repo = join(root, "../..");

// Validate content/utterances with the same code the server uses, then
// write the prebuilt index. Any invalid record throws here (fail closed).
mkdirSync(join(root, "dist"), { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "tecken-content-"));
try {
    const loader = join(scratch, "content.mjs");
    await build({
        entryPoints: [join(root, "src/content.ts")],
        outfile: loader,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        logLevel: "warning",
    });
    const { loadContent, serializeContent } = await import(
        pathToFileURL(loader).href
    );
    const index = loadContent(join(repo, "content/utterances"));
    writeFileSync(
        join(root, "dist/content-index.json"),
        serializeContent(index),
    );
    console.log(`content index: ${index.all.length} records`);
} finally {
    rmSync(scratch, { recursive: true, force: true });
}

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
