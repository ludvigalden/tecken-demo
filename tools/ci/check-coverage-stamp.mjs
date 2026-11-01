// Checks that the coverage line in README.md and README.en.md matches
// content/utterances. Run with --write to update both READMEs in place.
// Usage: node tools/ci/check-coverage-stamp.mjs [--write]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = "content/utterances";
const records = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
const count = (kind) => records.filter((r) => r.kind === kind).length;
const utterances = count("utterance");
const signs = count("single-sign");
const letters = records
    .filter((r) => r.kind === "fingerspelling-letter")
    .map((r) => r.text_sv.toUpperCase())
    .toSorted((a, b) => a.localeCompare(b, "sv"));
const linkOuts = count("link-out");
if (letters.length === 0 || linkOuts === 0) {
    throw new Error("content/utterances has no letters or no link-outs");
}
const range = `${letters[0]}–${letters.at(-1)}`;

const stamps = {
    "README.md": `${utterances} inspelade yttranden, ${signs} enskilda tecken och handalfabetet ${range} (${letters.length} bokstäver) från Wikimedia Commons; exempelmeningar ur Svenskt teckenspråkslexikon länkas (${linkOuts} ord), de visas inte här.`,
    "README.en.md": `${utterances} recorded utterances, ${signs} single signs and the Swedish manual alphabet ${range} (${letters.length} letters) from Wikimedia Commons; example sentences from the Swedish Sign Language Dictionary are linked (${linkOuts} words), not shown here.`,
};

const START = "<!-- coverage-stamp:start -->";
const END = "<!-- coverage-stamp:end -->";
const write = process.argv.includes("--write");
let failed = false;
for (const [file, stamp] of Object.entries(stamps)) {
    const text = readFileSync(file, "utf8");
    const a = text.indexOf(START);
    const b = text.indexOf(END);
    if (a === -1 || b === -1 || b < a) {
        console.error(`${file}: coverage-stamp markers missing`);
        failed = true;
        continue;
    }
    const current = text.slice(a + START.length, b).trim();
    if (current === stamp) {
        console.log(`${file}: stamp matches content/`);
    } else if (write) {
        writeFileSync(
            file,
            `${text.slice(0, a + START.length)}\n\n${stamp}\n${text.slice(b)}`,
        );
        console.log(`${file}: stamp written`);
    } else {
        console.error(`${file}: stamp differs from content/`);
        console.error(`  expected: ${stamp}`);
        console.error(`  found:    ${current}`);
        failed = true;
    }
}
process.exitCode = failed ? 1 : 0;
