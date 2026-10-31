import { describe, expect, it } from "vitest";
import { wcagContrast } from "culori";
import { contrastPairs, effectiveColor } from "./tokens";
import type { ContrastPair } from "./tokens";
import { plantedBadPair } from "./fixtures/planted-bad-pair";

const minRatio = { text: 4.5, "non-text": 3 } as const;

function ratio(pair: ContrastPair): number {
    return wcagContrast(
        effectiveColor(pair.background),
        effectiveColor(pair.foreground),
    );
}

describe("token contrast (pairs as rendered, effective values)", () => {
    it("declares the rendered FKUI badge, button and focus pairs", () => {
        const names = contrastPairs.map((p) => p.name);
        expect(names).toContain("FBadge success (recorded)");
        expect(names).toContain("FBadge info (link-out)");
        expect(names).toContain("FBadge warning (unsupported)");
        expect(names).toContain("focus-ring on surface-default");
        expect(contrastPairs.length).toBeGreaterThanOrEqual(25);
    });

    for (const pair of contrastPairs) {
        it(`${pair.name} meets ${minRatio[pair.kind]}:1`, () => {
            const r = ratio(pair);
            expect(r, `${pair.name}: ${r.toFixed(2)}`).toBeGreaterThanOrEqual(
                minRatio[pair.kind],
            );
        });
    }

    it("a planted failing pair is rejected by the same check (negative control)", () => {
        expect(ratio(plantedBadPair)).toBeLessThan(
            minRatio[plantedBadPair.kind],
        );
    });
});
