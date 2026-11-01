// Fails unless every browser declared in tests/playwright.config.mjs ran
// every declared test and none were skipped. The expected count per browser
// comes from `playwright test --list --reporter=json` over the same config,
// so a uniform partial run (32/32/32 of 33) fails too. A declared browser
// that is skipped, missing, empty or only partly run fails the job.
// Usage: node tools/ci/check-browsers.mjs <run-report.json> <list-report.json>
import { readFileSync } from "node:fs";
import { E2E_BROWSERS } from "../../tests/playwright.config.mjs";

const [reportPath, listPath] = process.argv.slice(2);
if (!reportPath || !listPath) {
    throw new Error(
        "usage: check-browsers.mjs <run-report.json> <list-report.json>",
    );
}
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const list = JSON.parse(readFileSync(listPath, "utf8"));
if ((list.errors ?? []).length > 0) {
    throw new Error("the --list report has load errors; no expected count");
}

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
const declared = collect(list.suites, new Map());
let failed = false;
for (const name of E2E_BROWSERS) {
    const statuses = byProject.get(name) ?? [];
    const skipped = statuses.filter((s) => s === "skipped").length;
    const expected = (declared.get(name) ?? []).length;
    console.log(
        `${name}: ${statuses.length} of ${expected} declared tests, ${skipped} skipped`,
    );
    if (expected > 0 && statuses.length === expected && skipped === 0) {
        continue;
    }

    console.error(`declared browser ${name} did not run every test`);
    failed = true;
}
process.exitCode = failed ? 1 : 0;
