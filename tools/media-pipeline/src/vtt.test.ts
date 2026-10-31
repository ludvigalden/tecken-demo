import { describe, expect, it } from "vitest";
import { vttFor } from "./pipeline";

describe("vttFor", () => {
    it("wraps the source title in a full-length cue", () => {
        const vtt = vttFor('Tecknet för "hej"', 2.84);
        expect(vtt).toContain("WEBVTT");
        expect(vtt).toContain("00:00:00.000 --> 00:00:02.840");
        expect(vtt).toContain('Tecknet för "hej"');
    });
});
