import { describe, expect, it } from "vitest";
import {
    BASE_CSP_DIRECTIVES,
    CONTENT_SECURITY_POLICY,
    designSystemCsp,
} from "./security-headers";

function directives(csp: string): Map<string, string> {
    return new Map(
        csp.split("; ").map((d) => {
            const [name = "", ...rest] = d.split(" ");
            return [name, rest.join(" ")];
        }),
    );
}

describe("security headers", () => {
    it("the production CSP is exactly the checklist policy", () => {
        expect(CONTENT_SECURITY_POLICY).toBe(
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
        );
    });

    it("the scoped /designsystem/ CSP never uses unsafe-*", () => {
        const csp = designSystemCsp({ scripts: ["abc="], styles: ["def="] });
        expect(csp).not.toMatch(/unsafe-/);
        expect(csp).toContain("upgrade-insecure-requests");
    });

    it("differs from the base policy in exactly three directives", () => {
        const base = directives(CONTENT_SECURITY_POLICY);
        const scoped = directives(
            designSystemCsp({ scripts: ["abc="], styles: ["def="] }),
        );
        expect([...scoped.keys()]).toEqual([...base.keys()]);
        const changed = [...base.keys()].filter(
            (k) => base.get(k) !== scoped.get(k),
        );
        expect(changed).toEqual(["script-src", "style-src", "frame-ancestors"]);
        expect(scoped.get("script-src")).toBe("'self' 'sha256-abc='");
        expect(scoped.get("style-src")).toBe("'self' 'sha256-def='");
    });

    it("relaxes frame-ancestors only to same-origin, for the Storybook preview iframe", () => {
        const scoped = directives(designSystemCsp({ scripts: [], styles: [] }));
        expect(scoped.get("frame-ancestors")).toBe("'self'");
        expect(directives(CONTENT_SECURITY_POLICY).get("frame-ancestors")).toBe(
            "'none'",
        );
    });

    it("lists every base directive once", () => {
        const names = BASE_CSP_DIRECTIVES.map(([n]) => n);
        expect(new Set(names).size).toBe(names.length);
    });
});
