import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
    allowedMediaLicences,
    utteranceRecord,
} from "@ludvigalden-demo/tecken-contracts";
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";

/**
 * The content index. The bundle step (scripts/bundle.mjs) validates every
 * record in content/utterances against the contract and writes them as one
 * prebuilt file, so the server does no directory walk at startup. An invalid
 * record fails the build (fail closed); it is never served.
 */

export interface ContentIndex {
    all: readonly UtteranceRecord[];
    byId: ReadonlyMap<string, UtteranceRecord>;
    playable: readonly UtteranceRecord[];
    letters: readonly UtteranceRecord[];
    linkOuts: readonly UtteranceRecord[];
}

/**
 * A record may be played only when it carries media AND every rights field
 * is known: code, data, output, and a media licence in the redistributable
 * set that agrees with the provenance licence. Anything else (missing or
 * unknown rights, an NC licence, a mismatch) is not playable.
 */
export function isPlayable(record: UtteranceRecord): boolean {
    if (record.kind === "link-out" || !record.video || !record.video_alt) {
        return false;
    }
    const rights = record.rights;
    if (!rights) {
        return false;
    }
    const mediaLicences: readonly string[] = allowedMediaLicences;
    return (
        mediaLicences.includes(rights.media) &&
        rights.media === record.provenance.licence &&
        rights.code === "MIT" &&
        rights.data === "CC-BY-4.0"
    );
}

export function buildIndex(records: readonly UtteranceRecord[]): ContentIndex {
    return {
        all: records,
        byId: new Map(records.map((r) => [r.id, r])),
        playable: records.filter((r) => isPlayable(r)),
        letters: records.filter(
            (r) => r.kind === "fingerspelling-letter" && isPlayable(r),
        ),
        linkOuts: records.filter((r) => r.kind === "link-out"),
    };
}

export function loadContent(utterancesDir: string): ContentIndex {
    const records = readdirSync(utterancesDir)
        .filter((f) => f.endsWith(".json"))
        .toSorted()
        .map((f) => {
            const raw: unknown = JSON.parse(
                readFileSync(join(utterancesDir, f), "utf8"),
            );
            const parsed = utteranceRecord.safeParse(raw);
            if (!parsed.success) {
                throw new Error(
                    `content record ${f} is invalid: ${parsed.error.message}`,
                );
            }
            return parsed.data;
        });
    return buildIndex(records);
}

/** Serializes a validated index for the prebuilt content file. */
export function serializeContent(index: ContentIndex): string {
    return `${JSON.stringify(index.all)}\n`;
}

/**
 * Reads the prebuilt content file written at build time. The records are
 * checked against the contract again, so a hand-edited or truncated file
 * still fails closed instead of being served.
 */
export function readContentIndex(file: string): ContentIndex {
    const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
    const parsed = utteranceRecord.array().safeParse(raw);
    if (!parsed.success) {
        throw new Error(
            `prebuilt content index ${file} is invalid: ${parsed.error.message}`,
        );
    }
    return buildIndex(parsed.data);
}
