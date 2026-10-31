import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    LANGUAGE_SIGN,
    LANGUAGE_TEXT,
    matchResult,
    utteranceRecord,
    utteranceRecordJsonSchema,
} from "./index";
import type { UtteranceRecord } from "./index";

/** A record from content/utterances, unvalidated: the tests parse it. */
function corpus(id: string): UtteranceRecord {
    return JSON.parse(
        readFileSync(
            join(import.meta.dirname, `../../../content/utterances/${id}.json`),
            "utf8",
        ),
    ) as UtteranceRecord;
}

const validMediaRecord = corpus("hej");
const validLinkOut = corpus("lexikon-hej");

describe("utteranceRecord", () => {
    it("accepts a valid media record", () => {
        expect(utteranceRecord.parse(validMediaRecord)).toBeTruthy();
    });

    it("accepts a valid link-out record without media", () => {
        expect(utteranceRecord.parse(validLinkOut)).toBeTruthy();
    });

    it("rejects reviewed without reviewed_by", () => {
        const bad = {
            ...validMediaRecord,
            review: { status: "reviewed" },
        };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });

    it("accepts reviewed with reviewed_by", () => {
        const good = {
            ...validMediaRecord,
            review: {
                status: "reviewed",
                reviewed_by: "Ludvig Aldén",
                reviewed_at: "2026-10-30",
            },
        };
        expect(utteranceRecord.parse(good)).toBeTruthy();
    });

    it("rejects an NC licence on a redistributed media record", () => {
        const bad = {
            ...validMediaRecord,
            provenance: {
                ...validMediaRecord.provenance,
                licence: "CC BY-NC-SA 4.0",
                licence_url:
                    "https://creativecommons.org/licenses/by-nc-sa/4.0",
            },
        };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });

    it("accepts the NC licence on a link-out", () => {
        const good = {
            ...validLinkOut,
            provenance: {
                ...validLinkOut.provenance,
                licence: "CC BY-NC-SA 4.0",
                licence_url:
                    "https://creativecommons.org/licenses/by-nc-sa/4.0",
            },
        };
        expect(utteranceRecord.parse(good)).toBeTruthy();
    });

    it("rejects a licence outside the allowed set", () => {
        const bad = {
            ...validMediaRecord,
            provenance: {
                ...validMediaRecord.provenance,
                licence: "CC BY-NC-ND 4.0",
            },
        };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });

    it("rejects a media record missing its video", () => {
        const { video: _omit, ...bad } = validMediaRecord;
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });

    it("rejects a link-out that carries media fields", () => {
        const bad = { ...validLinkOut, video: validMediaRecord.video };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });

    it("rejects unknown keys (strict)", () => {
        const bad = { ...validMediaRecord, extra: 1 };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });
});

describe("matchResult", () => {
    it("accepts each shape", () => {
        expect(
            matchResult.parse({ result: "exact", utterance: validMediaRecord }),
        ).toBeTruthy();
        expect(
            matchResult.parse({
                result: "suggested",
                suggestions: [validMediaRecord],
            }),
        ).toBeTruthy();
        expect(
            matchResult.parse({
                result: "fingerspelling",
                letters: [validMediaRecord],
            }),
        ).toBeTruthy();
        expect(
            matchResult.parse({ result: "unsupported", reason: "för långt" }),
        ).toBeTruthy();
    });

    it("rejects an empty suggestion list", () => {
        expect(
            matchResult.safeParse({ result: "suggested", suggestions: [] })
                .success,
        ).toBe(false);
    });
});

describe("generated JSON Schema", () => {
    it("has the record title and required fields", () => {
        expect(utteranceRecordJsonSchema.$schema).toContain("json-schema.org");
        expect(
            Object.keys(utteranceRecordJsonSchema.properties ?? {}),
        ).toContain("text_sv");
    });
});

describe("language ids", () => {
    it("keeps sv for text and swl for STS", () => {
        expect(LANGUAGE_TEXT).toBe("sv");
        expect(LANGUAGE_SIGN).toBe("swl");
    });
});
