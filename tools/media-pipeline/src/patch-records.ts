import { createHash } from "node:crypto";
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { utteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import {
    STS_VRT_TICKET,
    captionTextFor,
    loadLinkOutFixture,
    vttFor,
    writeLinkOuts,
} from "./pipeline";
import type { Manifest } from "./pipeline";

/**
 * Re-derives record fields that do not need a fresh download: Swedish
 * caption text and VTT files, webm/poster hashes, the Spread the Sign VRT
 * ticket, and the link-out records from the live-verified fixture. Media
 * bytes are never touched.
 */

function sha256File(path: string): string {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        "repo-root": { type: "string", default: "." },
        "retrieved-at": { type: "string" },
    },
});
const root = values["repo-root"] ?? ".";
const retrievedAt = values["retrieved-at"];
if (!retrievedAt) {
    console.error(
        "--retrieved-at is required (date the link-out pages were verified)",
    );
    process.exitCode = 2;
    throw new Error("--retrieved-at is required");
}

const manifest = JSON.parse(
    readFileSync(join(root, "tools/media-pipeline/manifest.json"), "utf8"),
) as Manifest;
const utterancesDir = join(root, "content/utterances");

let patched = 0;
for (const clip of manifest.clips) {
    const path = join(utterancesDir, `${clip.id}.json`);
    const record = JSON.parse(readFileSync(path, "utf8")) as Record<
        string,
        unknown
    > & {
        video: { duration_s: number };
        caption: { text: string };
        provenance: { author: string; permission_ticket: string | null };
    };
    const description = record.caption.text;
    const text = captionTextFor(clip, description);
    const durationS = record.video.duration_s;
    writeFileSync(
        join(root, `content/media/${clip.id}.vtt`),
        vttFor(text, durationS),
    );

    const webm = `content/media/${clip.id}.webm`;
    const webp = `content/media/${clip.id}.webp`;
    const next = {
        id: record.id,
        kind: record.kind,
        text_sv: record.text_sv,
        sts_variant: record.sts_variant,
        video: record.video,
        video_alt: {
            file: webm,
            mime: "video/webm",
            duration_s: durationS,
            sha256: sha256File(join(root, webm)),
        },
        poster: { file: webp, sha256: sha256File(join(root, webp)) },
        original_sha256: record.original_sha256,
        transformations: record.transformations,
        provenance: {
            ...record.provenance,
            permission_ticket:
                record.provenance.author === "Spread the Sign"
                    ? STS_VRT_TICKET
                    : null,
        },
        rights: record.rights,
        review: record.review,
        caption: { kind: "vtt", lang: "sv", text },
    };
    utteranceRecord.parse(next);
    writeFileSync(path, `${JSON.stringify(next, null, 4)}\n`);
    patched += 1;
}

// Link-outs: remove every existing link-out record, then rewrite from the fixture.
const fixture = loadLinkOutFixture(
    join(root, "tools/media-pipeline/link-outs.json"),
);
for (const f of readdirSync(utterancesDir)) {
    if (!f.endsWith(".json")) {
        continue;
    }
    const r = JSON.parse(readFileSync(join(utterancesDir, f), "utf8")) as {
        kind: string;
    };
    if (r.kind === "link-out") {
        unlinkSync(join(utterancesDir, f));
    }
}
writeLinkOuts(
    root,
    retrievedAt,
    join(root, "tools/media-pipeline/link-outs.json"),
);

console.log(
    `patched ${patched} media records; wrote ${fixture.length} link-outs`,
);
