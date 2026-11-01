// Fails unless every browser declared in tests/playwright.config.mjs ran
// tests, none were skipped, and every browser ran the same number of
// tests. A declared browser that is skipped, missing, empty or only partly
// run fails the job (a declared browser that is skipped fails).
// Usage: node tools/ci/check-browsers.mjs <playwright-json-report>
import { readFileSync } from "node:fs";
import { E2E_BROWSERS } from "../../tests/playwright.config.mjs";

const reportPath = process.argv[2];
if (!reportPath) {
    throw new Error("usage: check-browsers.mjs <playwright-json-report>");
}
const report = JSON.parse(readFileSync(reportPath, "utf8"));

/** Collects every test result, keyed by project name. */
function collect(suites, into) {
    for (const suite of suites ?? []) {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                const list = into.get(test.projectName) ?? [];
                list.push(test.status);
                into.set(test.projectName, list);
            }
        }
        collect(suite.suites, into);
    }
    return into;
}

const byProject = collect(report.suites, new Map());
let failed = false;
for (const name of E2E_BROWSERS) {
    const statuses = byProject.get(name) ?? [];
    const skipped = statuses.filter((s) => s === "skipped").length;
    console.log(`${name}: ${statuses.length} tests, ${skipped} skipped`);
    if (!(statuses.length === 0 || skipped > 0)) {
        continue;
    }

    console.error(`declared browser ${name} did not run every test`);
    failed = true;
}
const counts = new Set(
    E2E_BROWSERS.map((name) => (byProject.get(name) ?? []).length),
);
if (counts.size > 1) {
    console.error(
        `declared browsers ran different test counts: ${[...counts].join(", ")}`,
    );
    failed = true;
}
process.exitCode = failed ? 1 : 0;
