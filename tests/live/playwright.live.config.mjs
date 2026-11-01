import { defineConfig } from "@playwright/test";
import { E2E_BROWSERS } from "../playwright.config.mjs";

/**
 * Live smoke against a deployed URL (TECKEN_LIVE_URL). Real TLS: no
 * ignoreHTTPSErrors, no local server. The first navigation may wake a
 * scaled-to-zero container, so navigations get a long timeout.
 */
const baseURL = process.env.TECKEN_LIVE_URL;
if (!baseURL) {
    throw new Error("TECKEN_LIVE_URL must be set for the live smoke");
}

export default defineConfig({
    testDir: ".",
    testMatch: "*.spec.mjs",
    reporter: [["list"]],
    workers: 1,
    retries: 0,
    timeout: 90_000,
    use: {
        baseURL,
        navigationTimeout: 60_000,
        // Only for rehearsing the smoke against a local container with the
        // throwaway certificate; never set against a deployed URL.
        ignoreHTTPSErrors: process.env.TECKEN_LIVE_SELF_SIGNED === "1",
    },
    projects: E2E_BROWSERS.map((name) => ({
        name,
        use: { browserName: name },
    })),
});
