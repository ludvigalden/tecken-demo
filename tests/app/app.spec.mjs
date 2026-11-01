// Working-behavior proof: the built app, through the real Node server
// over local TLS, in Chromium, Firefox and WebKit. Every journey also checks
// zero CSP violations, and every route and state is axe-checked.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import {
    armCspCollector,
    axeViolations,
    focusedText,
    lookup,
    playbackAdvances,
} from "./journeys.mjs";

const UTTERANCES = join(import.meta.dirname, "../../content/utterances");

/** A record from content/utterances, the values the journeys expect. */
function corpus(id) {
    return JSON.parse(readFileSync(join(UTTERANCES, `${id}.json`), "utf8"));
}

test("Mode A: exact match shows provenance first, plays with Swedish captions", async ({
    context,
    page,
}) => {
    const csp = await armCspCollector(context);
    await page.goto("/");
    await lookup(page, "Jag behöver tvätta lite");
    await page.getByRole("heading", { name: /Inspelat yttrande/u }).waitFor();
    expect(await focusedText(page)).toMatch(/^Inspelat yttrande/u);
    await expect(page.locator(".badge").first()).toContainText(
        "Inspelad källa",
    );
    const play = await playbackAdvances(page);
    expect(play.currentTime).toBeGreaterThan(0.2);
    expect(play.captionMode).toBe("showing");
    expect(play.cueText).toBe(corpus("jag-behover-tvatta-lite").caption.text);
    expect(await axeViolations(page, null)).toEqual([]);
    expect(csp.get(page) ?? []).toEqual([]);
});

test("Mode B: suggestion confirm dialog, axe-clean while open", async ({
    context,
    page,
}) => {
    const csp = await armCspCollector(context);
    await page.goto("/");
    await lookup(page, "jag behöver tvätta");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Föreslaget stöttat meddelande");
    expect(await axeViolations(page, null)).toEqual([]);
    await dialog.getByRole("button", { name: "Ja, visa" }).click();
    await expect(
        page.getByRole("heading", { name: /Inspelat yttrande/u }),
    ).toBeVisible();
    expect(csp.get(page) ?? []).toEqual([]);
});

test("Mode B: declining returns focus to the input", async ({ page }) => {
    await page.goto("/");
    await lookup(page, "jag behöver tvätta");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Nej" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("#phrase")).toBeFocused();
});

test("negation is explained and announced, never matched or suggested", async ({
    page,
}) => {
    await page.goto("/");
    await lookup(page, "jag behöver inte tvätta lite");
    await expect(
        page.getByRole("heading", { name: "Ingen inspelning för den frasen" }),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText("motsatt betydelse");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('[role="status"]').first()).toContainText(
        "Ingen inspelning",
    );
});

test("fingerspelling plays two letters in sequence", async ({
    context,
    page,
}) => {
    const csp = await armCspCollector(context);
    await page.goto("/fingerstavning");
    await page.getByLabel("Skriv ett ord att stava").fill("Åsa");
    await page.getByRole("button", { name: "Stava", exact: true }).click();
    await page.getByRole("button", { name: "Bokstav för bokstav" }).click();
    const status = page.locator(".t-fingerspelling [role=status]");
    await expect(status).toHaveText("Bokstav 1 av 3: Å");
    const play = await playbackAdvances(page);
    expect(play.cueText).toBe(corpus("letter-aring").caption.text);
    await page.getByRole("button", { name: "Nästa bokstav" }).click();
    await expect(status).toHaveText("Bokstav 2 av 3: S");
    expect(await axeViolations(page, null)).toEqual([]);
    expect(csp.get(page) ?? []).toEqual([]);
});

for (const [path, heading] of [
    ["/om", "Om Tecken"],
    ["/kallor", "Källor och licenser"],
    ["/tillganglighet", "Tillgänglighet"],
    ["/finns-inte", "Sidan finns inte"],
]) {
    test(`route ${path}: renders and is axe-clean`, async ({
        context,
        page,
    }) => {
        const csp = await armCspCollector(context);
        await page.goto(path);
        await expect(
            page.getByRole("heading", { level: 1, name: heading }),
        ).toBeVisible();
        if (path === "/kallor") {
            await expect(page.locator("main li")).toHaveCount(45);
        }
        expect(await axeViolations(page, null)).toEqual([]);
        expect(csp.get(page) ?? []).toEqual([]);
    });
}

test("the app never requests the lexicon's media", async ({ page }) => {
    const hits = [];
    page.on("request", (r) => {
        if (r.url().includes("teckensprakslexikon.su.se")) {
            hits.push(r.url());
        }
    });
    await page.goto("/");
    await lookup(page, "hur mår du idag");
    await expect(
        page.locator("main a[href*='teckensprakslexikon']"),
    ).toHaveCount(6);
    expect(hits).toEqual([]);
});
