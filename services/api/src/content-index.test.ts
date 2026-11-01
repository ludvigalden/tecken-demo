import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent, readContentIndex, serializeContent } from "./content";

/**
 * The prebuilt content index (written by scripts/bundle.mjs) must carry the
 * same records as content/utterances, and a corrupted file must fail
 * closed at startup rather than be served.
 */

const repoRoot = join(import.meta.dirname, "../../..");
const dir = mkdtempSync(join(tmpdir(), "tecken-index-"));

describe("prebuilt content index", () => {
    it("round-trips every record and the playable set", () => {
        expect.hasAssertions();
        const source = loadContent(join(repoRoot, "content/utterances"));
        const file = join(dir, "content-index.json");
        writeFileSync(file, serializeContent(source));
        const index = readContentIndex(file);
        expect(index.all).toEqual(source.all);
        expect(index.playable.map((r) => r.id)).toEqual(
            source.playable.map((r) => r.id),
        );
        expect(index.linkOuts).toHaveLength(source.linkOuts.length);
    });

    it("rejects a record that breaks the contract", () => {
        expect.hasAssertions();
        const source = loadContent(join(repoRoot, "content/utterances"));
        const file = join(dir, "bad-index.json");
        const records = JSON.parse(serializeContent(source)) as Array<{
            kind: string;
        }>;
        const [first] = records;
        if (!first) {
            throw new Error("no records to corrupt");
        }
        first.kind = "bogus";
        writeFileSync(file, JSON.stringify(records));
        expect(() => readContentIndex(file)).toThrow(/is invalid/);
    });
});
