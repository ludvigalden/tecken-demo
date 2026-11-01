// Local stand-in for the CI app spec: runs the same shared journeys
// (journeys.mjs) through the Playwright library API, in every declared
// browser, against a running server.
// Usage: node tests/app/run-local.mjs https://127.0.0.1:8444
import { chromium, firefox, webkit } from "@playwright/test";
import { E2E_BROWSERS } from "../playwright.config.mjs";
import { JOURNEYS, armCspCollector, axeNegativeControl } from "./journeys.mjs";

const base = process.argv[2] ?? "https://127.0.0.1:8444";
const ENGINES = { chromium, firefox, webkit };
let failures = 0;
let passes = 0;

function report(ok, label, detail = "") {
    const suffix = detail ? ` ${detail}` : "";
    console.log(`${ok ? "OK  " : "FAIL"} ${label}${suffix}`);
    if (ok) {
        passes += 1;
    } else {
        failures += 1;
    }
}

for (const browserName of E2E_BROWSERS) {
    const type = ENGINES[browserName];
    if (!type) {
        // A declared browser that cannot run fails the run (fail closed).
        report(false, `${browserName}: declared but unavailable`);
        continue;
    }
    console.log(`== ${browserName}`);
    const browser = await type.launch();
    const fresh = () =>
        browser.newContext({ ignoreHTTPSErrors: true, baseURL: base });
    for (const journey of JOURNEYS) {
        const context = await fresh();
        const csp = await armCspCollector(context);
        const page = await context.newPage();
        try {
            await journey.run({ page, csp, browserName });
            report(true, journey.name);
        } catch (error) {
            report(false, journey.name, String(error).split("\n", 1)[0]);
        }
        await context.close();
    }
    const context = await fresh();
    const page = await context.newPage();
    try {
        const violations = await axeNegativeControl(page);
        report(
            violations.includes("image-alt(1)"),
            "axe negative control: planted image without alt fails the gate",
            violations.join(","),
        );
    } catch (error) {
        report(false, "axe negative control", String(error).split("\n", 1)[0]);
    }
    await context.close();
    await browser.close();
}
console.log(`TOTAL_PASSES=${passes} TOTAL_FAILURES=${failures}`);
process.exitCode = failures > 0 ? 1 : 0;
