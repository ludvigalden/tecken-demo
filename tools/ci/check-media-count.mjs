// Fails if the content tree's counts do not match the manifest.
// Usage: node tools/ci/check-media-count.mjs
// Expected media files = clips × 4 (mp4, webm, webp poster, vtt captions).
import { readFileSync, readdirSync } from "node:fs";

const manifest = JSON.parse(
    readFileSync("tools/media-pipeline/manifest.json", "utf8"),
);
const clips = manifest.clips.length;
const expected = clips * 4;
const media = readdirSync("content/media").filter((f) => f !== "REUSE.toml");
const utterances = readdirSync("content/utterances").filter((f) =>
    f.endsWith(".json"),
);

console.log(
    `clips=${clips} expected_media=${expected} (${clips}×2 transcodes + ${clips} posters + ${clips} vtt)`,
);
console.log(
    `actual_media=${media.length} utterance_records=${utterances.length}`,
);

let failed = false;
if (media.length !== expected) {
    console.error(`media count mismatch: ${media.length} != ${expected}`);
    failed = true;
}
if (utterances.length !== clips + 6) {
    console.error(
        `utterance count mismatch: ${utterances.length} != ${clips + 6} (clips + 6 link-outs)`,
    );
    failed = true;
}
process.exit(failed ? 1 : 0);
