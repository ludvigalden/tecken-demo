import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    exactMatch,
    fingerspell,
    isNegated,
    normalize,
    suggest,
} from "./matcher";

/** Records from content/utterances, reduced to the fields the matcher reads. */
function corpus(id: string): { id: string; kind: string; text_sv: string } {
    const r = JSON.parse(
        readFileSync(
            join(import.meta.dirname, `../../../content/utterances/${id}.json`),
            "utf8",
        ),
    ) as { id: string; kind: string; text_sv: string };
    return { id: r.id, kind: r.kind, text_sv: r.text_sv };
}

const TVATTA = "jag-behover-tvatta-lite";
const candidates = [
    "hej",
    TVATTA,
    "musik-pa-teckensprak-ar-sa-vackert",
    "bil",
    "lexikon-hej",
].map(corpus);
const letters = ["h", "e", "j", "aring"].map((l) => corpus(`letter-${l}`));

describe("normalize", () => {
    it("applies NFC, casefold, punctuation strip and whitespace collapse", () => {
        expect.hasAssertions();
        expect(normalize("  Jag   BEHÖVER, tvätta lite! ")).toBe(
            "jag behöver tvätta lite",
        );
        // Decomposed å (a + combining ring) normalises to the composed form.
        expect(normalize("å")).toBe("å");
    });
});

describe("exactMatch", () => {
    it("matches a normalised phrase", () => {
        expect.hasAssertions();
        expect(exactMatch("Jag behöver tvätta lite", candidates)?.id).toBe(
            TVATTA,
        );
        expect(exactMatch("HEJ!", candidates)?.id).toBe("hej");
    });

    it("never returns a link-out or empty input", () => {
        expect.hasAssertions();
        expect(exactMatch("hej", candidates)?.kind).toBe("utterance");
        expect(exactMatch("   ", candidates)).toBeUndefined();
    });
});

describe("suggest (negation guard)", () => {
    it("suggests a near match", () => {
        expect.hasAssertions();
        const s = suggest("jag behöver tvätta", candidates);
        expect(s[0]?.candidate.id).toBe(TVATTA);
    });

    it("never suggests across a negation", () => {
        expect.hasAssertions();
        for (const neg of ["inte", "ej", "aldrig"]) {
            const input = `jag behöver ${neg} tvätta lite`;
            expect(isNegated(input)).toBe(true);
            expect(exactMatch(input, candidates)).toBeUndefined();
            expect(suggest(input, candidates, { threshold: 0 })).toEqual([]);
        }
    });

    it("returns nothing below the threshold", () => {
        expect.hasAssertions();
        expect(suggest("helt annat", candidates)).toEqual([]);
    });
});

describe("fingerspell", () => {
    it("spells a word letter by letter, including å", () => {
        expect.hasAssertions();
        expect(fingerspell("Hej", letters)?.map((l) => l.id)).toEqual([
            "letter-h",
            "letter-e",
            "letter-j",
        ]);
        expect(fingerspell("hå", letters)?.map((l) => l.id)).toEqual([
            "letter-h",
            "letter-aring",
        ]);
    });

    it("refuses a word with an unavailable letter", () => {
        expect.hasAssertions();
        expect(fingerspell("hx", letters)).toBeUndefined();
    });
});
