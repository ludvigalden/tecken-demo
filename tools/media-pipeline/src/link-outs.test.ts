import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadLinkOutFixture } from "./pipeline";

/**
 * Guards the link-out record ↔ lexicon page identity.
 *
 * The fixture `tools/media-pipeline/link-outs.json` holds each page's live
 * `<title>` word, verified by fetching the page. CI does not fetch the
 * lexicon (no network dependency on a third-party site in unit tests), so:
 *  - this test proves every committed record matches the fixture exactly;
 *  - the fixture itself is re-verified manually with the documented command
 *    in docs/content/link-outs.md whenever it changes.
 */

const repoRoot = join(import.meta.dirname, "../../..");
const fixture = loadLinkOutFixture(
    join(repoRoot, "tools/media-pipeline/link-outs.json"),
);

function linkOutRecords(): Array<Record<string, unknown>> {
    const dir = join(repoRoot, "content/utterances");
    return readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map(
            (f) =>
                JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<
                    string,
                    unknown
                >,
        )
        .filter((r) => r.kind === "link-out");
}

describe("link-out identity", () => {
    it("has exactly one record per fixture entry", () => {
        const ids = linkOutRecords()
            .map((r) => r.id)
            .toSorted();
        expect(ids).toEqual(fixture.map((f) => f.id).toSorted());
    });

    it("every record's word, URL and title match its verified page", () => {
        const byId = new Map(linkOutRecords().map((r) => [r.id, r]));
        for (const f of fixture) {
            const r = byId.get(f.id) as {
                text_sv: string;
                link_out_url: string;
                provenance: { source_title: string; source_url: string };
            };
            expect(r.text_sv, f.id).toBe(f.word);
            expect(r.link_out_url, f.id).toBe(
                `https://teckensprakslexikon.su.se/ord/${f.ord}`,
            );
            expect(r.provenance.source_url, f.id).toBe(r.link_out_url);
            expect(r.provenance.source_title, f.id).toBe(
                `Svenskt teckenspråkslexikon: ${f.title}`,
            );
        }
    });

    it("the record word appears in the verified page title", () => {
        for (const f of fixture) {
            expect(f.title.split(/,\s*/), f.ord).toContain(f.word);
        }
    });

    it("link-outs carry no rights block (no media to license)", () => {
        for (const r of linkOutRecords()) {
            expect(r.rights, String(r.id)).toBeUndefined();
        }
    });
});
