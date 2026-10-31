import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
    ATTRIBUTION,
    buildSanitizedSprite,
    sanitizeSprite,
    symbolIds,
} from "./sanitize-sprite";

const require = createRequire(import.meta.url);
const spritePath =
    require.resolve("@fkui/icon-lib-default/dist/f/spritesheet.svg");

const RAW = readFileSync(spritePath, "utf8");

describe("sanitize-sprite", () => {
    it("produces no style substring and keeps the MIT attribution comment", () => {
        const out = buildSanitizedSprite(spritePath);
        expect(out.includes("style")).toBe(false);
        expect(out.startsWith(ATTRIBUTION)).toBe(true);
    });

    it("keeps all 31 symbol ids unchanged", () => {
        const out = sanitizeSprite(RAW);
        expect(symbolIds(RAW)).toHaveLength(31);
        expect(symbolIds(out)).toEqual(symbolIds(RAW));
    });

    it("converts inline style attributes to presentation attributes", () => {
        const out = sanitizeSprite(RAW);
        expect(out).toContain('fill="currentColor"');
        expect(out).toContain('fill-rule="evenodd"');
    });

    it("f-icon-i's <style> block is gone", () => {
        const out = sanitizeSprite(RAW);
        expect(out).not.toMatch(/<style[\s\S]*?<\/style>/);
    });
});
