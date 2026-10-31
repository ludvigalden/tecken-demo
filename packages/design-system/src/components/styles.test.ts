import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The design check's counterpart: component styles may use only semantic
 * tokens — no raw colours or lengths outside the token sources. */
describe("component styles use semantic tokens", () => {
    it("components.scss contains no raw colour or length literals", () => {
        const scss = readFileSync(
            join(import.meta.dirname, "components.scss"),
            "utf8",
        );
        expect(scss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(scss).not.toMatch(/\b\d+(\.\d+)?(px|rem|em)\b/);
        expect(scss).not.toMatch(/\b(rgb|hsl|oklch)\(/i);
        expect(scss).toMatch(/var\(--tecken-/);
    });
});
