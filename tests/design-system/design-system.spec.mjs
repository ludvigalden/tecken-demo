// Acceptance: zero axe violations and zero CSP violations over the built stories
// and tokens-plain-html.html, in Chromium, Firefox and WebKit, served over
// local TLS with the production header policy.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import {
    BADGE_EXPECTATIONS,
    BROWSER_DEFAULT_FONTS,
    PLAIN_HTML_TARGET,
    armCspCollector,
    axeViolations,
    badgeColors,
    normalizeFontList,
    plantInlineStyle,
    rootFont,
    shadowRootsWithStyle,
    storyTargets,
} from "./checks.mjs";

const index = JSON.parse(
    readFileSync(
        join(
            import.meta.dirname,
            "../../apps/storybook/storybook-static/index.json",
        ),
        "utf8",
    ),
);
const stories = storyTargets(index);

test("story list is non-empty", () => {
    expect(stories.length).toBeGreaterThanOrEqual(7);
});

for (const target of stories) {
    test(`${target.label}: axe + CSP clean`, async ({ context, page }) => {
        const csp = await armCspCollector(context);
        await page.goto(target.url);
        await page.locator(`${target.scope} > *`).first().waitFor();
        expect(await axeViolations(page, target.scope)).toEqual([]);
        expect(csp.get(page) ?? []).toEqual([]);
        expect(await shadowRootsWithStyle(page)).toBe(0);
    });
}

test("tokens-plain-html: axe + CSP clean, typography from tokens", async ({
    context,
    page,
}) => {
    const csp = await armCspCollector(context);
    await page.goto(PLAIN_HTML_TARGET.url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await axeViolations(page, null)).toEqual([]);
    expect(csp.get(page) ?? []).toEqual([]);
    const font = await rootFont(page);
    expect(font.html).not.toMatch(BROWSER_DEFAULT_FONTS);
    expect(normalizeFontList(font.html)).toBe(normalizeFontList(font.token));
});

test("CSP listener positive control", async ({ context, page }) => {
    const csp = await armCspCollector(context);
    await page.goto(PLAIN_HTML_TARGET.url);
    await plantInlineStyle(page);
    await expect.poll(() => (csp.get(page) ?? []).length).toBeGreaterThan(0);
});

for (const expected of BADGE_EXPECTATIONS) {
    test(`badge renders Tecken status tokens: ${expected.story}`, async ({
        page,
    }) => {
        await page.goto(
            `/designsystem/iframe.html?id=${encodeURIComponent(expected.story)}&viewMode=story`,
        );
        await page.locator("#storybook-root .badge").first().waitFor();
        expect(await badgeColors(page)).toEqual({
            background: expected.background,
            color: expected.color,
        });
    });
}
