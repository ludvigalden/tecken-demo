// Writes apps/web/src/generated/fkui-sprite.svg, the FKUI icon sprite with
// every inline style removed, from @fkui/icon-lib-default.
// Usage: node tools/icons/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { buildSanitizedSprite } from "../src/sanitize-sprite.ts";

const require = createRequire(import.meta.url);
const spritePath =
    require.resolve("@fkui/icon-lib-default/dist/f/spritesheet.svg");
const outDir = join(import.meta.dirname, "../../../apps/web/src/generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(
    join(outDir, "fkui-sprite.svg"),
    buildSanitizedSprite(spritePath),
);
