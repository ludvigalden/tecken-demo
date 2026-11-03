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

    it("removes nested <style> blocks that a single pass would reassemble", () => {
        const nested =
            '<symbol id="f-icon-i"><sty<style></style>le>.a{}</style><path d="Z"/></symbol>';
        expect(sanitizeSprite(nested)).toBe(
            '<symbol id="f-icon-i"><path fill="currentColor" d="Z"/></symbol>',
        );
    });

    it("removes <style> blocks in any letter case", () => {
        const mixed =
            '<symbol id="f-icon-i"><STYLE>.a{}</STYLE><Style>.b{}</sTyLe><path d="Z"/></symbol>';
        expect(sanitizeSprite(mixed)).toBe(
            '<symbol id="f-icon-i"><path fill="currentColor" d="Z"/></symbol>',
        );
    });

    it("removes nested <style> blocks in mixed case", () => {
        const nested =
            '<symbol id="f-icon-i"><ST<STYLE></STYLE>YLE>.a{}</Style><path d="Z"/></symbol>';
        expect(sanitizeSprite(nested)).toBe(
            '<symbol id="f-icon-i"><path fill="currentColor" d="Z"/></symbol>',
        );
    });

    it("converts uppercase inline style attributes to presentation attributes", () => {
        const upper =
            '<symbol id="f-icon-x"><path STYLE="fill:currentColor" d="Z"/><path Style="fill-rule:evenodd;clip-rule:evenodd" d="Z"/></symbol>';
        expect(sanitizeSprite(upper)).toBe(
            '<symbol id="f-icon-x"><path fill="currentColor" d="Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="Z"/></symbol>',
        );
    });

    it("rejects any style substring left over, whatever its case", () => {
        expect(() =>
            sanitizeSprite(
                '<symbol id="f-icon-x"><path STYLE="fill:red" d="Z"/></symbol>',
            ),
        ).toThrow(/style substrings/);
    });
});
