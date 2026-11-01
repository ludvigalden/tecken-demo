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
 * Layout-stability probe, armed before the page loads. Two instruments:
 * - the Layout Instability API (Chromium only): sum of layout-shift values
 *   without recent input, i.e. CLS;
 * - engine-independent: the box of every landmark and of every element
 *   that carries a stable hook (headings, result sections, the player
 *   box, the footer), recorded once per rendered frame
 *   (requestAnimationFrame), so only states the user could see count. An
 *   element that is at a different place in a later frame of the same page
 *   (same URL and h1) has jumped.
 * The video element itself is excluded from the shift sum: Chromium
 * reports its internal caption box as a source with an empty end rect;
 * no page element moves (the second instrument checks that).
 */
/** A phrase whose heading and video caption both wrap on a phone. */
const LONG_PHRASE = corpus("musik-pa-teckensprak-ar-sa-vackert").text_sv;

function firstVideo(page) {
    return page.locator("main video").first();
}

function h1(page, name) {
    return page.getByRole("heading", { level: 1, name, exact: true });
}

/** Client navigation steps: link, the URL it commits, the target's h1. */
const NAV = [
    ["Fingerstavning", /\/fingerstavning$/u, "Fingerstavning"],
    ["Om", /\/om$/u, "Om Tecken"],
    ["Källor", /\/kallor$/u, "Källor och licenser"],
    ["Tillgänglighet", /\/tillganglighet$/u, "Tillgänglighet"],
    ["Sök fras", /\/$/u, "Sök en fras"],
    ["Källor", /\/kallor$/u, "Källor och licenser"],
];

/** In-page searches: path, field label, text, button. */
const SEARCHES = [
    ["/", "Skriv en fras på svenska", "hej", "Sök"],
    // A heading that wraps on a phone.
    ["/", "Skriv en fras på svenska", "jag behöver tvätta lite", "Sök"],
    // A heading and a video caption that both wrap on a phone.
    ["/", "Skriv en fras på svenska", LONG_PHRASE, "Sök"],
    ["/fingerstavning", "Skriv ett ord att stava", "Åsa", "Stava"],
];

async function armStability(page) {
    await page.addInitScript(() => {
        const state = { cls: 0, jumps: [], last: new Map() };
        Object.defineProperty(globalThis, "__stability", { value: state });
        const tracked =
            "header, main h1, main h2, main form, .result-section, .t-sign-result__media, .t-sign-result__info, main video, .t-skeleton--player, footer";
        let pageId = "";
        const snap = () => {
            // Boxes are compared within one page only: a navigation replaces
            // the page (and is user input), so a new URL or a new h1 starts
            // fresh. Within a page, every frame must keep every box in place.
            const id = `${location.pathname}${location.search}|${document.querySelector("main h1")?.textContent ?? ""}`;
            if (id !== pageId) {
                pageId = id;
                state.last.clear();
            }
            for (const el of document.querySelectorAll(tracked)) {
                // The skeleton player and the video share a key, so the
                // swap from one to the other is checked as one box.
                const cls =
                    typeof el.className === "string" ? el.className : "";
                const text = el.textContent?.trim().slice(0, 24);
                const k = el.matches("main video, .t-skeleton--player")
                    ? "player"
                    : el.id || `${el.tagName}.${cls}:${text}`;
                const r = el.getBoundingClientRect();
                const y = Math.round(r.top + scrollY);
                const box = [
                    Math.round(r.left),
                    y,
                    Math.round(r.width),
                    Math.round(r.height),
                ];
                const prev = state.last.get(k);
                if (
                    prev &&
                    box[2] > 0 &&
                    prev[2] > 0 &&
                    (Math.abs(prev[0] - box[0]) > 1 ||
                        Math.abs(prev[1] - box[1]) > 1 ||
                        Math.abs(prev[3] - box[3]) > 1)
                ) {
                    state.jumps.push(
                        `${k}: ${prev.join(",")} -> ${box.join(",")}`,
                    );
                }
                if (box[2] > 0) {
                    state.last.set(k, box);
                }
            }
        };
        // The header and its nav items persist across client navigation, so
        // they are compared across pages too: a nav item must not move when
        // the current page changes (links and browser back/forward alike).
        const persist = new Map();
        const snapPersistent = () => {
            const view = `${innerWidth}x${innerHeight}`;
            for (const el of document.querySelectorAll(
                "header, .site-nav li",
            )) {
                const href = el.querySelector("a")?.getAttribute("href");
                const k =
                    el.tagName === "LI"
                        ? `${view} nav ${href}`
                        : `${view} header`;
                const r = el.getBoundingClientRect();
                const box = [
                    Math.round(r.left),
                    Math.round(r.top + scrollY),
                    Math.round(r.width),
                    Math.round(r.height),
                ];
                const prev = persist.get(k);
                if (prev?.some((v, i) => Math.abs(v - box[i]) > 1)) {
                    state.jumps.push(
                        `${k}: ${prev.join(",")} -> ${box.join(",")}`,
                    );
                }
                persist.set(k, box);
            }
        };
        const frame = () => {
            snap();
            snapPersistent();
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        if (PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
            new PerformanceObserver((list) => {
                for (const e of list.getEntries()) {
                    const onlyVideo = e.sources?.every(
                        (s) =>
                            !s.node ||
                            s.node.nodeName === "VIDEO" ||
                            s.node.closest?.("video"),
                    );
                    if (
                        !e.hadRecentInput &&
                        !(onlyVideo && e.sources?.some((s) => !s.node))
                    ) {
                        state.cls += e.value;
                    }
                }
            }).observe({ type: "layout-shift", buffered: true });
        }
    });
}

/**
 * Reads and resets the probe. Callers first wait on the target's own ready
 * signal (its URL committed and its h1 or result rendered); this then
 * watches a further `settleMs` of frames, so a late swap (data arriving,
 * a skeleton replaced, an image or caption reflowing) is caught.
 */
async function readStability(page, settleMs = 1000) {
    await page.waitForTimeout(settleMs);
    return page.evaluate(() => {
        const s = globalThis.__stability;
        const out = { cls: s.cls, jumps: [...s.jumps] };
        s.cls = 0;
        s.jumps = [];
        s.last.clear();
        return out;
    });
}

function expectStable(result, where) {
    expect(result.jumps, where).toEqual([]);
    expect(result.cls, where).toBeLessThanOrEqual(0.01);
}

/**
 * Serves `/v1` through a per-test cache, optionally after a delay. The
 * stability journey measures layout, not the server: the first request for
 * each method, URL and body goes to the real API, repeats are answered from
 * the cache, so the journey stays far below the API's per-client rate limit
 * (60 requests a minute) that the parallel journeys share.
 */
async function cacheApi(page, cache, delayMs) {
    await page.route("**/v1/**", async (route) => {
        const request = route.request();
        const key = `${request.method()} ${request.url()} ${request.postData() ?? ""}`;
        let hit = cache.get(key);
        if (!hit) {
            const response = await route.fetch();
            hit = {
                status: response.status(),
                headers: response.headers(),
                body: await response.body(),
            };
            // Only successes are reused; a failure is served once, so it
            // surfaces in this step instead of poisoning every later one.
            if (response.ok()) {
                cache.set(key, hit);
            }
        }
        if (delayMs) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
        await route.fulfill(hit);
    });
}

/**
 * Every journey takes one context object: `{ page, csp, browserName }`.
 * @type {Array<{ name: string, timeout?: number, run: (t: { page: import("@playwright/test").Page, csp: WeakMap<object, string[]>, browserName: string }) => Promise<void> }>}
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
            // The clip starts by itself, muted, with its controls (2.2.2).
            const video = page.locator("video").first();
            await video.scrollIntoViewIfNeeded();
            await expect
                .poll(
                    () =>
                        video.evaluate((v) => ({
                            started: v.currentTime > 0.2,
                            muted: v.muted,
                            controls: v.controls,
                        })),
                    { timeout: 15_000 },
                )
                .toEqual({ started: true, muted: true, controls: true });
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
                page.locator(
                    ".unsupported-section a[href*='teckensprakslexikon']",
                ),
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
            // No extra click: the first letter's clip is there at once and
            // the sequence advances on its own.
            const status = page.locator(".t-fingerspelling [role=status]");
            await expect(status).toHaveText(/^Bokstav [1-3] av 3: [ÅSA]$/u);
            await expect(status).toHaveText("Bokstav 3 av 3: A", {
                timeout: 20_000,
            });
            await page
                .getByRole("button", { name: "Föregående bokstav" })
                .click();
            await page
                .getByRole("button", { name: "Föregående bokstav" })
                .click();
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
            // The video is the first focus stop after the result heading.
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
        name: "client navigation back to search shows no error and no stale result",
        async run({ page, csp }) {
            await page.goto("/");
            await lookup(page, "hej");
            await expect(
                page.getByRole("heading", { name: "Inspelat yttrande: hej" }),
            ).toBeVisible();
            await expect(page).toHaveURL(/\?q=hej$/u);
            // Away and back through the site navigation: a fresh, empty page.
            await page.getByRole("link", { name: "Om", exact: true }).click();
            await expect(
                page.getByRole("heading", { level: 1, name: "Om Tecken" }),
            ).toBeVisible();
            await page.getByRole("link", { name: "Sök fras" }).click();
            await expect(
                page.getByRole("heading", { level: 1, name: "Sök en fras" }),
            ).toBeVisible();
            await expect(page.locator("main")).not.toContainText("Fyll i text");
            await expect(
                page.getByRole("heading", { name: /Inspelat yttrande/u }),
            ).toHaveCount(0);
            await expect(page.locator("#phrase")).toHaveValue("");
            // Back through history: the search is restored from the URL.
            await page.goBack();
            await page.goBack();
            await expect(page).toHaveURL(/\?q=hej$/u);
            await expect(
                page.getByRole("heading", { name: "Inspelat yttrande: hej" }),
            ).toBeVisible();
            await expect(page.locator("#phrase")).toHaveValue("hej");
            await expect(page.locator("main")).not.toContainText("Fyll i text");
            await expectCleanState(page, csp);
        },
    },
    {
        name: "one result layout: video beside the info on wide screens, at most 80 % of the viewport high",
        async run({ page }) {
            const videoWidths = [];
            await page.setViewportSize({ width: 1280, height: 720 });
            for (const [path, ready] of [
                ["/?q=Jag%20beh%C3%B6ver%20tv%C3%A4tta%20lite", "main video"],
                ["/fingerstavning?ord=%C3%85sa", "main video"],
            ]) {
                await page.goto(path);
                await page.locator(ready).first().waitFor();
                const box = await page.evaluate(() => {
                    const media = document
                        .querySelector(".t-sign-result__media")
                        ?.getBoundingClientRect();
                    const info = document
                        .querySelector(".t-sign-result__info")
                        ?.getBoundingClientRect();
                    const video = document
                        .querySelector("main video")
                        ?.getBoundingClientRect();
                    return {
                        media: media && { x: media.x, top: media.top },
                        info: info && { x: info.x, top: info.top },
                        videoHeight: video?.height ?? 0,
                        videoWidth: video?.width ?? 0,
                        viewport: innerHeight,
                    };
                });
                expect(box.info?.x, path).toBeGreaterThan(box.media?.x ?? 0);
                expect(
                    Math.abs((box.info?.top ?? 0) - (box.media?.top ?? 0)),
                    path,
                ).toBeLessThan(2);
                expect(box.videoHeight, path).toBeLessThanOrEqual(
                    box.viewport * 0.8 + 1,
                );
                videoWidths.push(box.videoWidth);
            }
            // The same layout gives the same video size on both pages.
            expect(Math.abs(videoWidths[0] - videoWidths[1])).toBeLessThan(2);
        },
    },
    {
        name: "one player box: search and fingerspelling show the video at the same width and height",
        async run({ page }) {
            for (const [width, height] of [
                [1280, 800],
                [390, 844],
            ]) {
                await page.setViewportSize({ width, height });
                const boxes = [];
                // A 4:3 phrase clip and a square letter clip.
                for (const path of ["/?q=hej", "/fingerstavning?ord=hej"]) {
                    await page.goto(path);
                    const video = page.locator("main video").first();
                    await video.waitFor();
                    await page.waitForFunction(
                        () =>
                            (document.querySelector("main video")?.readyState ??
                                0) >= 1,
                    );
                    boxes.push(await video.boundingBox());
                }
                const [search, spell] = boxes;
                const size = `${width}x${height}`;
                expect(Math.abs(search.width - spell.width), size).toBeLessThan(
                    2,
                );
                expect(
                    Math.abs(search.height - spell.height),
                    size,
                ).toBeLessThan(2);
            }
        },
    },
    {
        name: "after a search the whole video is on screen at common laptop sizes, and focus is on the result",
        async run({ page, csp }) {
            for (const [width, height] of [
                [1280, 800],
                [1366, 768],
                [1440, 900],
                [1920, 1080],
            ]) {
                const size = `${width}x${height}`;
                await page.setViewportSize({ width, height });
                for (const [path, field, text, button, heading] of [
                    [
                        "/",
                        "Skriv en fras på svenska",
                        "hej",
                        "Sök",
                        "Inspelat yttrande: hej",
                    ],
                    [
                        "/fingerstavning",
                        "Skriv ett ord att stava",
                        "Åsa",
                        "Stava",
                        /Åsa/u,
                    ],
                ]) {
                    await page.goto(path);
                    await page.getByLabel(field).fill(text);
                    await page
                        .getByRole("button", { name: button, exact: true })
                        .click();
                    await expect(
                        page.getByRole("heading", { level: 2, name: heading }),
                    ).toBeFocused();
                    const video = page.locator("main video").first();
                    await video.waitFor();
                    const box = await video.boundingBox();
                    expect(box.y, `${size} ${path} top`).toBeGreaterThanOrEqual(
                        0,
                    );
                    expect(
                        box.y + box.height,
                        `${size} ${path} bottom`,
                    ).toBeLessThanOrEqual(height + 1);
                    expect(
                        box.x,
                        `${size} ${path} left`,
                    ).toBeGreaterThanOrEqual(0);
                    expect(
                        box.x + box.width,
                        `${size} ${path} right`,
                    ).toBeLessThanOrEqual(width + 1);
                }
            }
            await expectCleanState(page, csp);
        },
    },
    {
        name: "layout stability: no shift on load, client or history navigation or search, also with a slow API",
        // 2 sizes × 2 API delays × (9 loads + 6 navigations + 12 history
        // steps + 4 searches), each watched for longer than the API delay.
        timeout: 480_000,
        async run({ page }) {
            await armStability(page);
            const cache = new Map();
            const routes = [
                ["/", (p) => h1(p, "Sök en fras")],
                ["/fingerstavning", (p) => h1(p, "Fingerstavning")],
                ["/om", (p) => h1(p, "Om Tecken")],
                ["/kallor", (p) => h1(p, "Källor och licenser")],
                ["/tillganglighet", (p) => h1(p, "Tillgänglighet")],
                ["/?q=hej", firstVideo],
                [`/?q=${encodeURIComponent(LONG_PHRASE)}`, firstVideo],
                ["/fingerstavning?ord=%C3%85sa", firstVideo],
                ["/finns-inte", (p) => h1(p, "Sidan finns inte")],
            ];
            for (const [width, height] of [
                [1280, 800],
                [390, 844],
            ]) {
                await page.setViewportSize({ width, height });
                for (const delay of [0, 1200]) {
                    await page.unrouteAll({ behavior: "wait" });
                    await cacheApi(page, cache, delay);
                    const tag = `${width}x${height} api+${delay}ms`;
                    for (const [path, ready] of routes) {
                        await page.goto(path);
                        await expect(ready(page)).toBeVisible();
                        expectStable(
                            await readStability(page, 800 + delay),
                            `${tag} load ${path}`,
                        );
                    }
                    // Client-side navigation between every page. Each step
                    // waits for the URL to commit and for the target page's
                    // own h1 (the old page has an h1 too), and fails if the
                    // navigation never commits; then it watches the new page
                    // for longer than the API delay.
                    await page.goto("/");
                    await expect(h1(page, "Sök en fras")).toBeVisible();
                    await readStability(page, 200);
                    for (const [name, url, heading] of NAV) {
                        await page
                            .getByRole("link", { name, exact: true })
                            .click();
                        await expect(page, `${tag} nav ${name}`).toHaveURL(
                            url,
                            {
                                timeout: 5000 + delay,
                            },
                        );
                        await expect(h1(page, heading)).toBeVisible();
                        expectStable(
                            await readStability(page, 800 + delay),
                            `${tag} nav ${name}`,
                        );
                    }
                    // Browser back through the whole chain, then forward
                    // again.
                    const visited = [
                        [/\/$/u, "Sök en fras"],
                        ...NAV.map(([, u, h]) => [u, h]),
                    ];
                    const history = [
                        ...visited
                            .slice(0, -1)
                            .toReversed()
                            .map((v) => ["back", ...v]),
                        ...visited.slice(1).map((v) => ["forward", ...v]),
                    ];
                    for (const [step, url, heading] of history) {
                        await (step === "back"
                            ? page.goBack()
                            : page.goForward());
                        await expect(page, `${tag} ${step}`).toHaveURL(url, {
                            timeout: 5000 + delay,
                        });
                        await expect(h1(page, heading)).toBeVisible();
                        expectStable(
                            await readStability(page, 800 + delay),
                            `${tag} ${step} ${heading}`,
                        );
                    }
                    // A new search on the page: skeleton, then the result,
                    // in the same place.
                    for (const [path, field, text, button] of SEARCHES) {
                        await page.goto(path);
                        await expect(page.getByLabel(field)).toBeVisible();
                        await readStability(page, 200);
                        await page.getByLabel(field).fill(text);
                        await page
                            .getByRole("button", { name: button, exact: true })
                            .click();
                        // Fail at once on an error state, not on a timeout.
                        await expect(
                            page.locator(
                                "main video, main h2:text('Något gick fel')",
                            ),
                        ).toBeVisible({ timeout: 15_000 });
                        await expect(page.locator("main video")).toHaveCount(1);
                        expectStable(
                            await readStability(page, 800),
                            `${tag} search ${path} "${text}"`,
                        );
                    }
                }
            }
        },
    },
    {
        name: "skeleton: the loading result is aria-busy, silent, and still under reduced motion",
        async run({ page, csp }) {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto("/");
            const release = await holdNextMatch(page);
            await lookup(page, "hej");
            const busy = page.locator('[aria-busy="true"]');
            await expect(busy).toHaveCount(1);
            await expect(busy).toHaveAccessibleName("Söker…");
            // One live message ("Söker…"), not one per placeholder block.
            await expect(page.locator('[role="status"]').first()).toHaveText(
                "Söker…",
            );
            await expect(
                busy.locator('[role="status"], [aria-live]'),
            ).toHaveCount(0);
            const animation = await busy
                .locator(".t-skeleton")
                .first()
                .evaluate((el) => getComputedStyle(el).animationName);
            expect(animation).toBe("none");
            await expectCleanState(page, csp);
            release();
            await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
            await expect(
                page.getByRole("heading", { name: /Inspelat yttrande/u }),
            ).toBeVisible();
        },
    },
    {
        name: "fingerspelling spells a word that is also a recorded phrase",
        async run({ page, csp }) {
            await page.goto("/fingerstavning");
            await page.getByLabel("Skriv ett ord att stava").fill("hej");
            await page
                .getByRole("button", { name: "Stava", exact: true })
                .click();
            const status = page.locator(".t-fingerspelling [role=status]");
            await expect(status).toHaveText(/^Bokstav [1-3] av 3: [HEJ]$/u);
            await expect(page.locator("main")).not.toContainText(
                "inte finns i handalfabetet",
            );
            await expectCleanState(page, csp);
        },
    },
    {
        name: "Om källan expands and shows the source, author and licence; notes come after the video",
        async run({ page, csp }) {
            await page.goto("/?q=hej");
            const toggle = page.getByRole("button", { name: "Om källan" });
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            await toggle.click();
            await expect(toggle).toHaveAttribute("aria-expanded", "true");
            const details = page.locator(".t-provenance");
            await expect(details).toBeVisible();
            const { provenance } = corpus("hej");
            await expect(details).toContainText(provenance.author);
            await expect(details).toContainText(provenance.licence);
            await expect(
                details.getByRole("link", { name: provenance.licence }),
            ).toHaveAttribute("href", provenance.licence_url);
            await expect(details).toContainText("inte granskad här");
            // The review note is said once, inside the details.
            await expect(page.locator("main")).not.toContainText(
                "Granskningsstatus:",
            );
            // Source details sit after the video in reading order.
            const order = await page.evaluate(() => {
                const video = document.querySelector("main video");
                const panel = document.querySelector(".t-provenance");
                return video && panel
                    ? video.compareDocumentPosition(panel) &
                          Node.DOCUMENT_POSITION_FOLLOWING
                    : 0;
            });
            expect(order).toBeGreaterThan(0);
            await expectCleanState(page, csp);
        },
    },
    {
        // WCAG 1.4.10 and 1.4.4: no horizontal scroll at 320 CSS px (which is
        // also what 400 % zoom on a 1280 × 800 window gives: 320 × 200), and
        // none when the text alone is doubled, on every page and result.
        name: "reflow: no horizontal scroll at 320 CSS px, at 400 % zoom or with 200 % text, on every route",
        timeout: 180_000,
        async run({ page }) {
            await cacheApi(page, new Map(), 0);
            const noMatch = "Ingen inspelning för den frasen";
            const routes = [
                ["/", (p) => h1(p, "Sök en fras")],
                ["/fingerstavning", (p) => h1(p, "Fingerstavning")],
                ["/om", (p) => h1(p, "Om Tecken")],
                ["/kallor", (p) => h1(p, "Källor och licenser")],
                ["/tillganglighet", (p) => h1(p, "Tillgänglighet")],
                ["/finns-inte", (p) => h1(p, "Sidan finns inte")],
                ["/?q=hej", firstVideo],
                [`/?q=${encodeURIComponent(LONG_PHRASE)}`, firstVideo],
                [
                    "/?q=finns%20inte%20alls",
                    (p) => p.getByRole("heading", { name: noMatch }),
                ],
                ["/fingerstavning?ord=%C3%85sa", firstVideo],
            ];
            for (const [width, height, text] of [
                [320, 640, 1],
                [320, 200, 1],
                [320, 640, 2],
                [390, 844, 2],
            ]) {
                await page.setViewportSize({ width, height });
                for (const [path, ready] of routes) {
                    const where = `${width}x${height} text ${text * 100}% ${path}`;
                    await page.goto(path);
                    await expect(ready(page), where).toBeVisible();
                    // Text zoom: the user's default font size doubled. Set
                    // through the CSSOM, which the CSP allows.
                    const overflow = await page.evaluate(async (scale) => {
                        const root = document.documentElement;
                        root.style.setProperty(
                            "font-size",
                            `${scale * 100}%`,
                            "important",
                        );
                        await new Promise((r) =>
                            requestAnimationFrame(() =>
                                requestAnimationFrame(r),
                            ),
                        );
                        return root.scrollWidth - root.clientWidth;
                    }, text);
                    expect(overflow, where).toBeLessThanOrEqual(0);
                }
            }
            // The clip fits on screen at 320 px too.
            await page.setViewportSize({ width: 320, height: 640 });
            await page.goto("/?q=hej");
            const video = await firstVideo(page).evaluate(
                (v) => v.getBoundingClientRect().height,
            );
            expect(video).toBeLessThanOrEqual(640 * 0.8 + 1);
        },
    },
    {
        name: "less scrolling: on a laptop screen, an empty page and a short page do not scroll",
        async run({ page }) {
            await page.setViewportSize({ width: 1280, height: 800 });
            for (const path of ["/", "/fingerstavning", "/finns-inte"]) {
                await page.goto(path);
                await expect(
                    page.getByRole("heading", { level: 1 }),
                ).toBeVisible();
                const extra = await page.evaluate(
                    () =>
                        document.documentElement.scrollHeight -
                        document.documentElement.clientHeight,
                );
                expect(extra, path).toBeLessThanOrEqual(0);
            }
        },
    },
    {
        name: "reduced motion: no animation when the user asks for none",
        async run({ page }) {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto("/");
            await lookup(page, "hej");
            // The result's own section (a skeleton section precedes it while
            // the search is in flight).
            const section = page.locator(".result-section", {
                has: page.getByRole("heading", {
                    name: "Inspelat yttrande: hej",
                }),
            });
            await expect(section).toBeVisible();
            expect(
                await section.evaluate(
                    (s) => getComputedStyle(s).animationName,
                ),
            ).toBe("none");
            // Nor does the clip start by itself.
            await page.waitForTimeout(1500);
            expect(
                await page.locator("video").evaluate((v) => ({
                    paused: v.paused,
                    time: v.currentTime,
                })),
            ).toEqual({ paused: true, time: 0 });
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
                page.locator(
                    ".unsupported-section a[href*='teckensprakslexikon']",
                ),
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
