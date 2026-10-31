// Local stand-in for the CI design-system Playwright suite. It runs the same
// shared checks (checks.mjs) through the Playwright library API, in all three
// declared browsers, against the running harness.
// Usage: node tests/design-system/run-local.mjs https://127.0.0.1:8443
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
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

const base = process.argv[2] ?? "https://127.0.0.1:8443";
const index = JSON.parse(
    readFileSync(
        join(
            import.meta.dirname,
            "../../apps/storybook/storybook-static/index.json",
        ),
        "utf8",
    ),
);
const targets = [...storyTargets(index), PLAIN_HTML_TARGET];

async function waitUntil(predicate, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) {
            return true;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });
    }
    return predicate();
}

async function fontVerdict(page) {
    const font = await rootFont(page);
    const ok =
        !BROWSER_DEFAULT_FONTS.test(font.html) &&
        normalizeFontList(font.html) === normalizeFontList(font.token);
    return { ok, detail: `${font.html} vs ${font.token}` };
}

async function checkTarget(page, csp, target) {
    await page.goto(base + target.url);
    if (target.scope) {
        await page
            .locator(`${target.scope} > *`)
            .first()
            .waitFor({ timeout: 20_000 });
    }
    const axe = await axeViolations(page, target.scope);
    const violations = csp.get(page) ?? [];
    const shadow = await shadowRootsWithStyle(page);
    const font = target.scope
        ? { ok: true, detail: "" }
        : await fontVerdict(page);
    const ok =
        axe.length === 0 && violations.length === 0 && shadow === 0 && font.ok;
    const cspText = violations.length > 0 ? JSON.stringify(violations) : "0";
    const fontText = font.ok ? "" : ` font=${font.detail}`;
    console.log(
        `${ok ? "OK  " : "FAIL"} ${target.label} axe=${axe.join(",") || "0"} csp=${cspText} shadow=${shadow}${fontText}`,
    );
    return ok;
}

let failures = 0;
for (const [name, type] of [
    ["chromium", chromium],
    ["firefox", firefox],
    ["webkit", webkit],
]) {
    console.log(`== ${name}`);
    const browser = await type.launch();
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const csp = await armCspCollector(context);
    for (const target of targets) {
        const page = await context.newPage();
        if (!(await checkTarget(page, csp, target))) {
            failures += 1;
        }
        await page.close();
    }
    for (const expected of BADGE_EXPECTATIONS) {
        const page = await context.newPage();
        await page.goto(
            `${base}/designsystem/iframe.html?id=${encodeURIComponent(expected.story)}&viewMode=story`,
        );
        await page.locator("#storybook-root .badge").first().waitFor();
        const got = await badgeColors(page);
        const ok =
            got.background === expected.background &&
            got.color === expected.color;
        console.log(
            `${ok ? "OK  " : "FAIL"} badge ${expected.story} bg=${got.background} fg=${got.color}`,
        );
        if (!ok) {
            failures += 1;
        }
        await page.close();
    }
    const ctrl = await context.newPage();
    await ctrl.goto(base + PLAIN_HTML_TARGET.url);
    await plantInlineStyle(ctrl);
    const fired = await waitUntil(() => (csp.get(ctrl) ?? []).length > 0, 5000);
    console.log(`${fired ? "OK  " : "FAIL"} csp-listener-positive-control`);
    if (!fired) {
        failures += 1;
    }
    await browser.close();
}
console.log(`TOTAL_FAILURES=${failures}`);
process.exitCode = failures > 0 ? 1 : 0;
