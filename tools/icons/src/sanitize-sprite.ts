/**
 * Sanitizes \@fkui/icon-lib-default's spritesheet for a strict CSP:
 *  - `style="fill:currentColor"` → `fill="currentColor"`
 *  - `style="fill-rule:evenodd;clip-rule:evenodd"` → attributes
 *  - `f-icon-i`'s `<style>` block replaced by `fill="currentColor"` on paths
 * The 31 symbol ids are preserved. scripts/generate.mjs writes the result to
 * apps/web/src/generated/fkui-sprite.svg.
 */

import { readFileSync } from "node:fs";

export const ATTRIBUTION =
    "<!-- Derived from @fkui/icon-lib-default 6.63.0 (MIT, Försäkringskassan) -->";

export function sanitizeSprite(source: string): string {
    let svg = source;

    svg = svg.replaceAll('style="fill:currentColor"', 'fill="currentColor"');
    svg = svg.replaceAll(
        'style="fill-rule:evenodd;clip-rule:evenodd"',
        'fill-rule="evenodd" clip-rule="evenodd"',
    );

    svg = svg.replace(
        /(<symbol[^>]*id="f-icon-i"[^>]*>)([\s\S]*?)(<\/symbol>)/,
        (_match, open: string, body: string, close: string) =>
            open +
            body
                .replace(/<style[\s\S]*?<\/style>/g, "")
                .replace(
                    /<path(?![^>]*\sfill=)/g,
                    '<path fill="currentColor"',
                ) +
            close,
    );

    const leftover = (svg.match(/style/g) ?? []).length;
    if (leftover !== 0) {
        throw new Error(
            `sanitized sprite still contains ${leftover} style substrings`,
        );
    }
    return svg;
}

export function symbolIds(source: string): string[] {
    return [...source.matchAll(/<symbol\s[^>]*id="([^"]+)"/g)].map(
        (m) => m[1] ?? "",
    );
}

export function buildSanitizedSprite(sourcePath: string): string {
    const source = readFileSync(sourcePath, "utf8");
    const before = symbolIds(source);
    const sanitized = sanitizeSprite(source);
    const after = symbolIds(sanitized);
    if (
        before.length !== after.length ||
        before.some((id, i) => id !== after[i])
    ) {
        throw new Error("symbol ids changed during sanitization");
    }
    return `${ATTRIBUTION}\n${sanitized}`;
}
