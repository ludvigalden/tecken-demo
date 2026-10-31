// Shared browser checks for the design-system suite. The CI spec
// (design-system.spec.mjs) and the local runner (run-local.mjs) both use
// these, so local and CI verdicts come from identical logic.
import { AxeBuilder } from "@axe-core/playwright";

export const WCAG_TAGS = [
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
];

export const BROWSER_DEFAULT_FONTS =
    /^("Times New Roman"|serif|-webkit-standard)$/;

/**
 * Arms CSP-violation collection for every page of a browser context.
 * Violations are reported to Node through a Playwright binding (a function
 * call, never a write to the page's global object) and collected per page.
 * @param {import("@playwright/test").BrowserContext} context
 * @returns {Promise<WeakMap<object, string[]>>} violations keyed by page
 */
export async function armCspCollector(context) {
    const byPage = new WeakMap();
    await context.exposeBinding("tecken_reportCsp", ({ page }, line) => {
        const list = byPage.get(page) ?? [];
        list.push(line);
        byPage.set(page, list);
    });
    await context.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
            void globalThis.tecken_reportCsp(
                `${e.violatedDirective} ${e.blockedURI} ${e.sample}`,
            );
        });
    });
    return byPage;
}

/** @param {import("@playwright/test").Page} page */
export function shadowRootsWithStyle(page) {
    return page.evaluate(
        () =>
            [...document.querySelectorAll("*")].filter((el) =>
                el.shadowRoot?.querySelector("style"),
            ).length,
    );
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {string | null} scope CSS selector to restrict axe to, or null
 */
export async function axeViolations(page, scope) {
    let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
    if (scope) {
        builder = builder.include(scope);
    }
    const result = await builder.analyze();
    return result.violations.map((v) => `${v.id}(${v.nodes.length})`);
}

/** Normalizes a font-family list across engines (WebKit drops quotes). */
export function normalizeFontList(value) {
    return value.replaceAll(/["']/g, "").replaceAll(/\s+/g, "");
}

/** @param {import("@playwright/test").Page} page */
export function rootFont(page) {
    return page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).fontFamily,
        token: getComputedStyle(document.documentElement)
            .getPropertyValue("--tecken-font-family-base")
            .trim(),
    }));
}

/** Plants an inline <style>, which the base CSP must report. */
export function plantInlineStyle(page) {
    return page.evaluate(() => {
        const s = document.createElement("style");
        s.textContent = "body{outline:1px solid}";
        document.head.append(s);
    });
}

/**
 * Story targets from the built Storybook index.
 * @param {{ entries: Record<string, { type: string; id: string }> }} index
 */
export function storyTargets(index) {
    return Object.values(index.entries)
        .filter((e) => e.type === "story")
        .map((e) => ({
            label: `story ${e.id}`,
            url: `/designsystem/iframe.html?id=${encodeURIComponent(e.id)}&viewMode=story`,
            scope: "#storybook-root",
        }));
}

export const PLAIN_HTML_TARGET = {
    label: "tokens-plain-html",
    url: "/examples/tokens-plain-html.html",
    scope: null,
};

/**
 * The provenance badge must render the tested Tecken status pairs, not FK's
 * default feedback palette. Values are the effective token
 * colours from packages/design-system/src/tokens/tokens.ts.
 */
export const BADGE_EXPECTATIONS = [
    {
        story: "domän-provenance-och-status--badge-inspelad",
        background: "rgb(31, 107, 79)",
        color: "rgb(255, 255, 255)",
    },
    {
        story: "domän-provenance-och-status--badge-lank",
        background: "rgb(29, 78, 216)",
        color: "rgb(255, 255, 255)",
    },
    {
        story: "domän-provenance-och-status--badge-ingen-inspelning",
        background: "rgb(146, 64, 14)",
        color: "rgb(255, 255, 255)",
    },
];

/** @param {import("@playwright/test").Page} page */
export function badgeColors(page) {
    return page
        .locator("#storybook-root .badge")
        .first()
        .evaluate((el) => {
            const cs = getComputedStyle(el);
            return { background: cs.backgroundColor, color: cs.color };
        });
}
