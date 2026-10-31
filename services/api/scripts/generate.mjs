// Writes contracts/openapi/tecken.openapi.json, the OpenAPI document of the
// routes in src/app.ts. The route modules are bundled to a scratch file
// first, because Node cannot import their extensionless TypeScript imports.
// Usage: node services/api/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(import.meta.dirname, "..");
const outDir = join(root, "../../contracts/openapi");
const scratch = mkdtempSync(join(tmpdir(), "tecken-openapi-"));
try {
    const entry = join(scratch, "routes.mjs");
    await build({
        stdin: {
            contents:
                'export { OPENAPI_INFO, createApp } from "./app";\nexport { buildIndex } from "./content";\n',
            resolveDir: join(root, "src"),
            loader: "ts",
        },
        outfile: entry,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        banner: {
            js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
        },
        logLevel: "warning",
    });
    const { OPENAPI_INFO, buildIndex, createApp } = await import(
        pathToFileURL(entry).href
    );
    const app = createApp({ content: buildIndex([]) });
    const doc = app.getOpenAPI31Document(OPENAPI_INFO);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
        join(outDir, "tecken.openapi.json"),
        `${JSON.stringify(doc, null, 4)}\n`,
    );
} finally {
    rmSync(scratch, { recursive: true, force: true });
}
