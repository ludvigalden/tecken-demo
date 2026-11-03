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

    svg = svg.replaceAll(/style="fill:currentColor"/gi, 'fill="currentColor"');
    svg = svg.replaceAll(
        /style="fill-rule:evenodd;clip-rule:evenodd"/gi,
        'fill-rule="evenodd" clip-rule="evenodd"',
    );

    svg = svg.replace(
        /(<symbol[^>]*id="f-icon-i"[^>]*>)([\s\S]*?)(<\/symbol>)/i,
        (_match, open: string, body: string, close: string) =>
            open +
            withoutStyleBlocks(body).replace(
                /<path(?![^>]*\sfill=)/gi,
                '$& fill="currentColor"',
            ) +
            close,
    );

    const leftover = (svg.match(/style/gi) ?? []).length;
    if (leftover !== 0) {
        throw new Error(
            `sanitized sprite still contains ${leftover} style substrings`,
        );
    }
    return svg;
}

/** Removes `<style>` blocks in any letter case until none is left, so a
 * nested block cannot reassemble into a new one. */
function withoutStyleBlocks(body: string): string {
    let text = body;
    let previous: string;
    do {
        previous = text;
        text = text.replaceAll(/<style[\s\S]*?<\/style>/gi, "");
    } while (text !== previous);
    return text;
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
