// Local stand-in for the CI app-journey spec: drives the built app through
// the real Node server in all three browsers via the Playwright library API.
// Usage: node tests/app/run-local.mjs https://127.0.0.1:8444
import { chromium, firefox, webkit } from "@playwright/test";
import {
    armCspCollector,
    axeViolations,
    focusedText,
    lookup,
    playbackAdvances,
} from "./journeys.mjs";

const base = process.argv[2] ?? "https://127.0.0.1:8444";
let failures = 0;

function report(ok, label, detail = "") {
    const suffix = detail ? ` ${detail}` : "";
    console.log(`${ok ? "OK  " : "FAIL"} ${label}${suffix}`);
    if (!ok) {
        failures += 1;
    }
}

async function journeyExact(page, csp) {
    await page.goto(`${base}/`);
    await lookup(page, "Jag behöver tvätta lite");
    const heading = page.getByRole("heading", { name: /Inspelat yttrande/u });
    await heading.waitFor();
    report(
        (await focusedText(page)).startsWith("Inspelat yttrande"),
        "exact: focus moves to the result heading",
    );
    const badge = await page.locator(".badge").first().textContent();
    report(
        /Inspelad källa/u.test(badge ?? ""),
        "exact: provenance badge before play",
    );
    const play = await playbackAdvances(page);
    report(
        play.currentTime > 0.2 && play.cues > 0,
        "exact: playback advances with Swedish cues",
        JSON.stringify(play),
    );
    const axe = await axeViolations(page, null);
    report(axe.length === 0, "exact: axe", axe.join(","));
    report(
        (csp.get(page) ?? []).length === 0,
        "exact: zero CSP violations",
        JSON.stringify(csp.get(page) ?? []),
    );
}

async function journeySuggest(page, csp) {
    await page.goto(`${base}/`);
    await lookup(page, "jag behöver tvätta");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    report(
        /Föreslaget stöttat meddelande/u.test(
            (await dialog.textContent()) ?? "",
        ),
        "suggest: confirm dialog names the suggestion",
    );
    const axe = await axeViolations(page, null);
    report(axe.length === 0, "suggest: axe with dialog open", axe.join(","));
    await dialog.getByRole("button", { name: "Ja, visa" }).click();
    await page.getByRole("heading", { name: /Inspelat yttrande/u }).waitFor();
    report(true, "suggest: confirm shows the result");
    report(
        (csp.get(page) ?? []).length === 0,
        "suggest: zero CSP violations",
        JSON.stringify(csp.get(page) ?? []),
    );
}

async function journeyDecline(page) {
    await page.goto(`${base}/`);
    await lookup(page, "jag behöver tvätta");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Nej" }).click();
    await dialog.waitFor({ state: "detached" });
    const focusedId = await page.evaluate(
        () => document.activeElement?.id ?? "",
    );
    report(
        focusedId === "phrase",
        "suggest: decline returns focus to the input",
        focusedId,
    );
}

async function journeyNegation(page) {
    await page.goto(`${base}/`);
    await lookup(page, "jag behöver inte tvätta lite");
    await page
        .getByRole("heading", { name: "Ingen inspelning för den frasen" })
        .waitFor();
    const text = (await page.locator("main").textContent()) ?? "";
    report(
        /motsatt betydelse/u.test(text),
        "negation: explained, never matched",
    );
    report(
        (await page.getByRole("dialog").count()) === 0,
        "negation: no suggestion dialog",
    );
    const status = await page.locator('[role="status"]').first().textContent();
    report(
        /Ingen inspelning/u.test(status ?? ""),
        "negation: announced in the status region",
    );
}

async function journeyFingerspelling(page, csp) {
    await page.goto(`${base}/fingerstavning`);
    await page.getByLabel("Skriv ett ord att stava").fill("Åsa");
    await page.getByRole("button", { name: "Stava", exact: true }).click();
    await page.getByRole("heading", { name: /Fingerstavning: Åsa/u }).waitFor();
    const step = page.getByRole("button", { name: "Bokstav för bokstav" });
    await step.click();
    await page.locator("video").first().waitFor();
    const first = await page
        .locator(".t-fingerspelling [role=status]")
        .textContent();
    report(
        /Bokstav 1 av 3: Å/u.test(first ?? ""),
        "fingerspelling: first letter announced",
        first ?? "",
    );
    const play = await playbackAdvances(page);
    report(
        play.currentTime > 0.2,
        "fingerspelling: letter clip plays",
        JSON.stringify(play),
    );
    await page.getByRole("button", { name: "Nästa bokstav" }).click();
    const second = await page
        .locator(".t-fingerspelling [role=status]")
        .textContent();
    report(
        /Bokstav 2 av 3: S/u.test(second ?? ""),
        "fingerspelling: plays two letters in sequence",
        second ?? "",
    );
    const axe = await axeViolations(page, null);
    report(axe.length === 0, "fingerspelling: axe", axe.join(","));
    report(
        (csp.get(page) ?? []).length === 0,
        "fingerspelling: zero CSP violations",
        JSON.stringify(csp.get(page) ?? []),
    );
}

async function journeyRoutes(page, csp) {
    for (const [path, heading] of [
        ["/om", "Om Tecken"],
        ["/kallor", "Källor och licenser"],
        ["/tillganglighet", "Tillgänglighet"],
        ["/finns-inte", "Sidan finns inte"],
    ]) {
        await page.goto(`${base}${path}`);
        await page.getByRole("heading", { level: 1, name: heading }).waitFor();
        const axe = await axeViolations(page, null);
        report(axe.length === 0, `route ${path}: axe`, axe.join(","));
    }
    await page.goto(`${base}/kallor`);
    await page.getByRole("heading", { name: "Inspelade klipp" }).waitFor();
    await page.locator("main li").nth(40).waitFor();
    const items = await page.locator("main li").count();
    report(
        items === 45,
        "sources: every clip and link-out attributed",
        String(items),
    );
    report(
        (csp.get(page) ?? []).length === 0,
        "routes: zero CSP violations",
        JSON.stringify(csp.get(page) ?? []),
    );
    const lexicon = await page.evaluate(
        () =>
            performance
                .getEntriesByType("resource")
                .filter((e) => e.name.includes("teckensprakslexikon.su.se"))
                .length,
    );
    report(
        lexicon === 0,
        "no request to the lexicon from the app",
        String(lexicon),
    );
}

for (const [name, type] of [
    ["chromium", chromium],
    ["firefox", firefox],
    ["webkit", webkit],
]) {
    console.log(`== ${name}`);
    const browser = await type.launch();
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const csp = await armCspCollector(context);
    for (const journey of [
        journeyExact,
        journeySuggest,
        journeyDecline,
        journeyNegation,
        journeyFingerspelling,
        journeyRoutes,
    ]) {
        const page = await context.newPage();
        try {
            await journey(page, csp);
        } catch (error) {
            report(
                false,
                `${journey.name} threw`,
                String(error).split("\n")[0],
            );
        }
        await page.close();
    }
    await browser.close();
}
console.log(`TOTAL_FAILURES=${failures}`);
process.exitCode = failures > 0 ? 1 : 0;
