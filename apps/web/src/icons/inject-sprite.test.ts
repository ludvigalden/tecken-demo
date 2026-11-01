import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { injectSanitizedSprite } from "./inject-sprite";

describe("injectSanitizedSprite", () => {
    it("injects the sanitized sprite hidden from assistive technology", () => {
        expect.hasAssertions();
        const source = readFileSync(
            join(import.meta.dirname, "../generated/fkui-sprite.svg"),
            "utf8",
        );
        const svg = injectSanitizedSprite(source, document.body);
        expect(document.body.firstElementChild).toBe(svg);
        expect(svg.hasAttribute("hidden")).toBe(true);
        expect(svg.getAttribute("aria-hidden")).toBe("true");
        expect(svg.querySelectorAll("symbol")).toHaveLength(31);
        expect(svg.outerHTML).not.toContain("style=");
    });
});
