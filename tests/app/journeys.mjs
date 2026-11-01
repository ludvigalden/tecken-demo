// Shared app-journey checks (working-behavior proof). The CI spec
// (app.spec.mjs) and the local runner (run-local.mjs) both drive these, so
// the verdicts come from one implementation.
export { armCspCollector, axeViolations } from "../design-system/checks.mjs";

/**
 * Submits a phrase on the lookup page and waits for the live status to
 * settle on a result message.
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
 * would), wait for currentTime to advance, and confirm the Swedish caption
 * track loaded its cues. Headless WebKit does not advance a video outside
 * the viewport, so the scroll is part of the honest user journey.
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
        return {
            currentTime: v.currentTime,
            captionMode: track?.mode ?? "none",
            cues: track?.cues?.length ?? 0,
            cueText: cue && "text" in cue ? cue.text : "",
        };
    });
}
