// Writes generated/records.ts, the real content records the stories render
// (the utterance "hej" and the letters H, E and J), from content/utterances.
// Usage: node apps/storybook/scripts/generate.mjs (`npm run generate`)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "../../../content/utterances");
const outDir = join(import.meta.dirname, "../generated");
const read = (id) => JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8"));
const json = (value) => JSON.stringify(value, null, 4);

mkdirSync(outDir, { recursive: true });
writeFileSync(
    join(outDir, "records.ts"),
    [
        "/* Generated from content/utterances by `lerna run generate` — do not edit. */",
        'import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";',
        "",
        `export const record: UtteranceRecord = ${json(read("hej"))};`,
        "",
        `export const letters: UtteranceRecord[] = ${json(["letter-h", "letter-e", "letter-j"].map(read))};`,
        "",
    ].join("\n"),
);
