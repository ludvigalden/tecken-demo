// Writes the app's generated files into src/generated/: schema.d.ts, the API
// types, from contracts/openapi/tecken.openapi.json.
// Usage: node apps/web/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const root = join(import.meta.dirname, "../../..");
const outDir = join(import.meta.dirname, "../src/generated");

async function apiSchema() {
    const spec = readFileSync(
        join(root, "contracts/openapi/tecken.openapi.json"),
        "utf8",
    );
    const ast = await openapiTS(spec);
    return `/* Generated from contracts/openapi/tecken.openapi.json by openapi-typescript — do not edit. */\n${astToString(ast)}`;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "schema.d.ts"), await apiSchema());
