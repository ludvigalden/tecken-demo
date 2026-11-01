// Shared app journeys (working-behaviour proof, e2e and accessibility
// suite). The CI spec (app.spec.mjs) and the local runner (run-local.mjs)
// both run every entry of JOURNEYS, so their verdicts come from one
// implementation. Assertions use Playwright's `expect`, which works the same
// inside and outside the test runner.
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import {
    BROWSER_DEFAULT_FONTS,
    axeViolations,
    normalizeFontList,
    shadowRootsWithStyle,
} from "../design-system/checks.mjs";

export { armCspCollector, axeViolations } from "../design-system/checks.mjs";

const STATES_DIR = join(import.meta.dirname, "../../docs/design/states");
const LEXICON_MEDIA = "teckensprakslexikon.su.se/movies/";
const UTTERANCES = join(import.meta.dirname, "../../content/utterances");

/** A record from content/utterances, the values the journeys expect. */
function corpus(id) {
    return JSON.parse(readFileSync(join(UTTERANCES, `${id}.json`), "utf8"));
}

/**
 * Submits a phrase on the lookup page.
 * @param {import("@playwright/test").Page} page
 */
export async function lookup(page, text) {
    await page.getByLabel("Skriv en fras på svenska").fill(text);
    await page.getByRole("button", { name: "Sök", exact: true }).click();
}

/** @param {import("@playwright/test").Page} page */
export function focusedText(page) {
    return page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? "",
    );
}

/**
 * Real playback proof: bring the clip into view and start it (as a user
 * would), wait for currentTime to advance, and read the Swedish caption
 * track. Headless WebKit does not advance a video outside the viewport, so
 * the scroll is part of the honest user journey.
 * @param {import("@playwright/test").Page} page
 */
export async function playbackAdvances(page) {
    const video = page.locator("video").first();
    await video.scrollIntoViewIfNeeded();
    await video.evaluate((v) => {
        v.muted = true;
        return v.play();
    });
    await page.waitForFunction(
        () => {
            const v = document.querySelector("video");
            const cues = v?.textTracks[0]?.cues?.length ?? 0;
            return v !== null && v.currentTime > 0.2 && cues > 0;
        },
        undefined,
        { timeout: 15_000 },
    );
    return video.evaluate((v) => {
        const track = v.textTracks[0];
        const cue = track?.cues?.[0];
        const active = track?.activeCues?.[0];
        return {
            currentTime: v.currentTime,
            captionMode: track?.mode ?? "none",
            cues: track?.cues?.length ?? 0,
            cueText: cue && "text" in cue ? cue.text : "",
            activeCueText: active && "text" in active ? active.text : "",
        };
    });
}

/**
 * Resolves a CSS custom property to the colour the engine computes for it,
 * by painting a probe element with it. Comparing computed against computed
 * keeps the assertion free of hard-coded colour values.
 * @param {import("@playwright/test").Page} page
 */
export function tokenColor(page, token) {
    return page.evaluate((name) => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = `var(${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
    }, token);
}

/** @param {import("@playwright/test").Locator} locator */
function colors(locator) {
    return locator.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { background: cs.backgroundColor, color: cs.color };
    });
}

const BADGE_TOKENS = {
    "badge--success": "--tecken-status-recorded",
    "badge--info": "--tecken-status-link-out",
    "badge--warning": "--tecken-status-unsupported",
};

/**
 * The in-app provenance badge renders the tested Tecken status pair, not
 * FK's default feedback palette.
 * @param {import("@playwright/test").Page} page
 */
export async function expectBadgeTokens(page, modifier) {
    const badge = page
        .locator(`main .badge.${modifier}, [role=dialog] .badge.${modifier}`)
        .first();
    await expect(badge).toBeVisible();
    const token = BADGE_TOKENS[modifier];
    expect(await colors(badge)).toEqual({
        background: await tokenColor(page, token),
        color: await tokenColor(page, `${token}-text`),
    });
}

/**
 * Typography comes from the token layer, never a browser default, on the
 * root, body, a heading, an FKUI button and an FKUI text input.
 * @param {import("@playwright/test").Page} page
 */
export async function expectTokenTypography(page) {
    const fonts = await page.evaluate(() => {
        const pick = (sel) => {
            const el = document.querySelector(sel);
            return el ? getComputedStyle(el).fontFamily : null;
        };
        return {
            token: getComputedStyle(document.documentElement)
                .getPropertyValue("--tecken-font-family-base")
                .trim(),
            html: pick("html"),
            body: pick("body"),
            h1: pick("h1"),
            button: pick("button.button"),
            input: pick("input.text-field__input, #phrase"),
        };
    });
    const { token, ...elements } = fonts;
    expect(token).not.toBe("");
    // html, body and h1 exist on every page; the FKUI controls on the forms.
    expect(elements.html).not.toBeNull();
    expect(elements.body).not.toBeNull();
    expect(elements.h1).not.toBeNull();
    for (const [name, family] of Object.entries(elements)) {
        if (family === null) {
            continue;
        }
        expect(family, name).not.toMatch(BROWSER_DEFAULT_FONTS);
        expect(normalizeFontList(family), name).toBe(normalizeFontList(token));
    }
}

/**
 * Accessibility gate for one route or state: axe (WCAG 2.0–2.2 A/AA),
 * zero CSP violations, and no shadow-root <style> anywhere.
 * @param {import("@playwright/test").Page} page
 * @param {WeakMap<object, string[]>} csp
 */
export async function expectCleanState(page, csp) {
    // Assess the settled state: a fade still running would make axe measure
    // contrast through partial opacity (seen on WebKit in CI). Infinite
    // animations (FKUI's loading spinner) never finish, so only finite ones
    // are awaited. An animation cancelled because its element left the page
    // rejects `finished` with AbortError; that also counts as settled.
    await page.evaluate(() =>
        Promise.allSettled(
            document
                .getAnimations()
                .filter(
                    (a) =>
                        a.effect?.getComputedTiming().iterations !== Infinity,
                )
                .map((a) => a.finished),
        ),
    );
    expect(await axeViolations(page, null)).toEqual([]);
    expect(csp.get(page) ?? []).toEqual([]);
    expect(await shadowRootsWithStyle(page)).toBe(0);
}

/**
 * Writes the state screenshot under docs/design/states/ when
 * TECKEN_WRITE_STATES=1 (regenerated deliberately, never on every run;
 * Chromium only, so the committed set is stable).
 * @param {import("@playwright/test").Page} page
 */
export async function captureState(page, browserName, name) {
    if (process.env.TECKEN_WRITE_STATES !== "1" || browserName !== "chromium") {
        return;
    }
    mkdirSync(STATES_DIR, { recursive: true });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.screenshot({
        path: join(STATES_DIR, `${name}.png`),
        fullPage: true,
        animations: "disabled",
    });
}

/** Records every request to the lexicon's media host. */
function watchLexiconMedia(page) {
    const hits = [];
    page.on("request", (r) => {
        if (r.url().includes(LEXICON_MEDIA)) {
            hits.push(r.url());
        }
    });
    return hits;
}

/**
 * Holds the next /v1/match response until released, so the loading state
 * can be observed and checked deterministically.
 * @param {import("@playwright/test").Page} page
 */
async function holdNextMatch(page) {
    const gate = Promise.withResolvers();
    await page.route("**/v1/match", async (route) => {
        await gate.promise;
        await route.continue();
    });
    return gate.resolve;
}

/**
 * Every journey takes one context object: `{ page, csp, browserName }`.
 * @type {Array<{ name: string, run: (t: { page: import("@playwright/test").Page, csp: WeakMap<object, string[]>, browserName: string }) => Promise<void> }>}
 */
export const JOURNEYS = [
    {
        name: "state empty: the lookup page before any search",
        async run({ page, csp, browserName }) {
            await page.goto("/");
            await expect(
                page.getByRole("heading", { level: 1, name: "Sök en fras" }),
            ).toBeVisible();
            // The icon sprite takes no layout space: the header starts at
            // the top of the page (an <svg hidden> alone still renders).
            const spriteHeight = await page
                .locator("body > svg[aria-hidden=true]")
                .evaluate((svg) => svg.getBoundingClientRect().height);
            expect(spriteHeight).toBe(0);
            await expect(page.locator("button.button")).toHaveCount(1);
            await expect(page.locator("input#phrase")).toHaveCount(1);
            await expectTokenTypography(page);
            await expectCleanState(page, csp);
            await captureState(page, browserName, "empty");
        },
    },
    {
        name: "state loading: announced while the match is in flight",
        async run({ page, csp, browserName }) {
            await page.goto("/");
            const release = await holdNextMatch(page);
            await lookup(page, "hej");
            await expect(page.locator('[role="status"]').first()).toHaveText(
                "Söker…",
            );
            await expectCleanState(page, csp);
            await captureState(page, browserName, "loading");
            release();
            await expect(
                page.getByRole("heading", { name: /Inspelat yttrande/u }),
            ).toBeVisible();
        },
    },
    {
        name: "Mode A, state result: provenance first, plays with Swedish captions",
        async run({ page, csp, browserName }) {
            const lexicon = watchLexiconMedia(page);
            await page.goto("/");
            await lookup(page, "Jag behöver tvätta lite");
            await page
                .getByRole("heading", { name: /Inspelat yttrande/u })
                .waitFor();
            expect(await focusedText(page)).toMatch(/^Inspelat yttrande/u);
            await expect(page.locator("main .badge").first()).toContainText(
                "Inspelad källa",
            );
            await expectBadgeTokens(page, "badge--success");
            await expectCleanState(page, csp);
            await captureState(page, browserName, "result");
            const play = await playbackAdvances(page);
            expect(play.currentTime).toBeGreaterThan(0.2);
            expect(play.captionMode).toBe("showing");
            expect(play.cues).toBeGreaterThan(0);
            const { caption } = corpus("jag-behover-tvatta-lite");
            expect(play.cueText).toBe(caption.text);
            expect(play.activeCueText).toBe(caption.text);
            expect(csp.get(page) ?? []).toEqual([]);
            expect(lexicon).toEqual([]);
        },
    },
    {
        name: "Mode B, state suggested: confirm dialog is axe-clean while open",
        async run({ page, csp, browserName }) {
            await page.goto("/");
            await lookup(page, "jag behöver tvätta");
            const dialog = page.getByRole("dialog");
            await expect(dialog).toContainText("Föreslaget stöttat meddelande");
            await expectBadgeTokens(page, "badge--success");
            await expectCleanState(page, csp);
            await captureState(page, browserName, "suggested-dialog");
            await dialog.getByRole("button", { name: "Ja, visa" }).click();
            await expect(
                page.getByRole("heading", { name: /Inspelat yttrande/u }),
            ).toBeVisible();
            expect(csp.get(page) ?? []).toEqual([]);
        },
    },
    {
        name: "Mode B: declining returns focus to the input",
        async run({ page }) {
            await page.goto("/");
            await lookup(page, "jag behöver tvätta");
            const dialog = page.getByRole("dialog");
            await dialog.getByRole("button", { name: "Nej" }).click();
            await expect(dialog).toHaveCount(0);
            await expect(page.locator("#phrase")).toBeFocused();
        },
    },
    {
        name: "Mode B: Escape closes the dialog and returns focus to the input",
        async run({ page }) {
            await page.goto("/");
            await lookup(page, "jag behöver tvätta");
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await expect(page.locator("#phrase")).toBeFocused();
        },
    },
    {
        name: "state unsupported: explicit status, supported list and link-outs",
        async run({ page, csp, browserName }) {
            const lexicon = watchLexiconMedia(page);
            await page.goto("/");
            await lookup(page, "hur mår du idag");
            await expect(
                page.getByRole("heading", {
                    name: "Ingen inspelning för den frasen",
                }),
            ).toBeVisible();
            await expect(page.locator('[role="status"]').first()).toHaveText(
                "Ingen inspelning hittades.",
            );
            await expect(
                page.locator("main a[href*='teckensprakslexikon']"),
            ).toHaveCount(6);
            await expectBadgeTokens(page, "badge--warning");
            await expectBadgeTokens(page, "badge--info");
            await expectCleanState(page, csp);
            await captureState(page, browserName, "unsupported");
            expect(lexicon).toEqual([]);
        },
    },
    {
        name: "negation is explained and announced, never matched or suggested",
        async run({ page, csp }) {
            await page.goto("/");
            await lookup(page, "jag behöver inte tvätta lite");
            await expect(
                page.getByRole("heading", {
                    name: "Ingen inspelning för den frasen",
                }),
            ).toBeVisible();
            await expect(page.locator("main")).toContainText(
                "motsatt betydelse",
            );
            await expect(page.getByRole("dialog")).toHaveCount(0);
            await expect(page.locator('[role="status"]').first()).toContainText(
                "Ingen inspelning",
            );
            await expectCleanState(page, csp);
        },
    },
    {
        name: "state error: a failed match is announced and offers a retry",
        async run({ page, csp, browserName }) {
            await page.goto("/");
            await page.route("**/v1/match", (route) =>
                route.fulfill({
                    status: 503,
                    contentType: "application/problem+json",
                    body: JSON.stringify({
                        type: "about:blank",
                        title: "Service unavailable",
                        status: 503,
                        code: "unavailable",
                    }),
                }),
            );
            await lookup(page, "hej");
            await expect(
                page.getByRole("heading", { name: "Något gick fel" }),
            ).toBeVisible();
            await expect(page.locator('[role="status"]').first()).toHaveText(
                "Sökningen misslyckades.",
            );
            await expectCleanState(page, csp);
            await captureState(page, browserName, "error");
            await page.unroute("**/v1/match");
            await page.getByRole("button", { name: "Försök igen" }).click();
            await expect(
                page.getByRole("heading", { name: /Inspelat yttrande/u }),
            ).toBeVisible();
        },
    },
    {
        name: "state fingerspelling playing: letter by letter, announced",
        async run({ page, csp, browserName }) {
            await page.goto("/fingerstavning");
            await page.getByLabel("Skriv ett ord att stava").fill("Åsa");
            await page
                .getByRole("button", { name: "Stava", exact: true })
                .click();
            await page
                .getByRole("button", { name: "Bokstav för bokstav" })
                .click();
            const status = page.locator(".t-fingerspelling [role=status]");
            await expect(status).toHaveText("Bokstav 1 av 3: Å");
            const play = await playbackAdvances(page);
            expect(play.cueText).toBe(corpus("letter-aring").caption.text);
            expect(play.activeCueText).toBe(play.cueText);
            await expectCleanState(page, csp);
            await captureState(page, browserName, "fingerspelling-playing");
            await page.getByRole("button", { name: "Nästa bokstav" }).click();
            await expect(status).toHaveText("Bokstav 2 av 3: S");
            expect(csp.get(page) ?? []).toEqual([]);
        },
    },
    {
        name: "keyboard only: skip link, search, play and suggestion, no pointer",
        async run({ page }) {
            await page.goto("/");
            await expect(page.locator("#phrase")).toBeVisible();
            await page.keyboard.press("Tab");
            await expect(page.locator(".skip-link")).toBeFocused();
            await page.keyboard.press("Enter");
            // The skip link moves focus into main: onto main itself
            // (Chromium) or onto its h1, where the router's hash navigation
            // places it (Firefox, WebKit). Either bypasses the header.
            await expect
                .poll(() =>
                    page.evaluate(
                        () =>
                            document
                                .querySelector("#main")
                                ?.contains(document.activeElement) ?? false,
                    ),
                )
                .toBe(true);
            // Tab forward from main to the phrase field.
            for (let i = 0; i < 10; i += 1) {
                if (
                    (await page.evaluate(() => document.activeElement?.id)) ===
                    "phrase"
                ) {
                    break;
                }
                await page.keyboard.press("Tab");
            }
            await expect(page.locator("#phrase")).toBeFocused();
            await page.keyboard.type("jag behöver tvätta");
            await page.keyboard.press("Enter");
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            // FKUI traps focus inside the dialog; the confirm button is
            // reachable by Tab and activated by Enter.
            const confirm = dialog.getByRole("button", { name: "Ja, visa" });
            for (let i = 0; i < 6; i += 1) {
                if (
                    await confirm.evaluate((b) => b === document.activeElement)
                ) {
                    break;
                }
                await page.keyboard.press("Tab");
            }
            await expect(confirm).toBeFocused();
            await page.keyboard.press("Enter");
            const heading = page.getByRole("heading", {
                name: /Inspelat yttrande/u,
            });
            await expect(heading).toBeFocused();
            // The video is the next focus stop after the provenance panel.
            const video = page.locator("video").first();
            for (let i = 0; i < 8; i += 1) {
                if (await video.evaluate((v) => v === document.activeElement)) {
                    break;
                }
                await page.keyboard.press("Tab");
            }
            await expect(video).toBeFocused();
            const outline = await video.evaluate(
                (v) => getComputedStyle(v).outlineStyle,
            );
            expect(outline).not.toBe("none");
        },
    },
    {
        name: "reflow: 320 CSS px wide with no horizontal scroll, on every route",
        async run({ page }) {
            await page.setViewportSize({ width: 320, height: 640 });
            for (const path of [
                "/",
                "/fingerstavning",
                "/om",
                "/kallor",
                "/tillganglighet",
            ]) {
                await page.goto(path);
                await expect(
                    page.getByRole("heading", { level: 1 }),
                ).toBeVisible();
                const overflow = await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth -
                        document.documentElement.clientWidth,
                );
                expect(overflow, path).toBeLessThanOrEqual(0);
            }
            await page.goto("/");
            await lookup(page, "Jag behöver tvätta lite");
            await page
                .getByRole("heading", { name: /Inspelat yttrande/u })
                .waitFor();
            const overflow = await page.evaluate(
                () =>
                    document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
            );
            expect(overflow, "result").toBeLessThanOrEqual(0);
        },
    },
    {
        name: "reduced motion: no animation when the user asks for none",
        async run({ page }) {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto("/");
            await lookup(page, "hej");
            const section = page.locator(".result-section");
            await expect(section).toBeVisible();
            expect(
                await section.evaluate(
                    (s) => getComputedStyle(s).animationName,
                ),
            ).toBe("none");
            await page.emulateMedia({ reducedMotion: "no-preference" });
            await lookup(page, "Jag behöver tvätta lite");
            await expect(
                page.getByRole("heading", {
                    name: `Inspelat yttrande: ${corpus("jag-behover-tvatta-lite").text_sv}`,
                }),
            ).toBeVisible();
            expect(
                await page
                    .locator(".result-section")
                    .evaluate((s) => getComputedStyle(s).animationName),
            ).toBe("tecken-fade-in");
        },
    },
    {
        name: "computed primary colour is the Tecken action token",
        async run({ page }) {
            await page.goto("/");
            const submit = page.getByRole("button", {
                name: "Sök",
                exact: true,
            });
            await expect(submit).toBeVisible();
            const expected = {
                background: await tokenColor(page, "--tecken-action-bg"),
                color: await tokenColor(page, "--tecken-action-text"),
            };
            // FKUI transitions the button background; poll until it settles.
            await expect.poll(() => colors(submit)).toEqual(expected);
        },
    },
    {
        name: "the app never requests the lexicon's media",
        async run({ page }) {
            const lexicon = watchLexiconMedia(page);
            const anyLexicon = [];
            page.on("request", (r) => {
                if (r.url().includes("teckensprakslexikon.su.se")) {
                    anyLexicon.push(r.url());
                }
            });
            await page.goto("/");
            await lookup(page, "hur mår du idag");
            await expect(
                page.locator("main a[href*='teckensprakslexikon']"),
            ).toHaveCount(6);
            await page.goto("/kallor");
            await expect(page.locator("main li")).toHaveCount(45);
            expect(lexicon).toEqual([]);
            expect(anyLexicon).toEqual([]);
        },
    },
    ...[
        ["/om", "Om Tecken"],
        ["/kallor", "Källor och licenser"],
        ["/tillganglighet", "Tillgänglighet"],
        ["/finns-inte", "Sidan finns inte"],
    ].map(([path, heading]) => ({
        name: `route ${path}: renders and is axe-clean`,
        async run({ page, csp }) {
            await page.goto(path);
            await expect(
                page.getByRole("heading", { level: 1, name: heading }),
            ).toBeVisible();
            if (path === "/kallor") {
                await expect(page.locator("main li")).toHaveCount(45);
            }
            await expectTokenTypography(page);
            await expectCleanState(page, csp);
        },
    })),
];

/**
 * Negative control: an image without alt text is
 * planted into the real app and the same axe gate must fail on it. Proves
 * the accessibility assertions can fail in every engine.
 * @param {import("@playwright/test").Page} page
 */
export async function axeNegativeControl(page) {
    await page.goto("/");
    await expect(
        page.getByRole("heading", { level: 1, name: "Sök en fras" }),
    ).toBeVisible();
    await page.evaluate(() => {
        const img = document.createElement("img");
        img.src = "/media/hej.webp";
        img.id = "planted-missing-alt";
        document.querySelector("main")?.append(img);
    });
    return axeViolations(page, null);
}
