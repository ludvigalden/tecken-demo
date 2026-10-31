import { defineConfig } from "@playwright/test";

/** Browsers are declared once; a skipped declared browser fails the run. */
export const E2E_BROWSERS = ["chromium", "firefox", "webkit"];

const port = Number(process.env.PORT ?? 8443);

export default defineConfig({
    testDir: ".",
    testMatch: "*.spec.mjs",
    reporter: [["list"]],
    workers: 2,
    timeout: 60_000,
    use: {
        baseURL: `https://127.0.0.1:${port}`,
        ignoreHTTPSErrors: true,
    },
    projects: E2E_BROWSERS.map((name) => ({
        name,
        use: { browserName: name },
    })),
    webServer: {
        command: "node server.mjs",
        url: `https://127.0.0.1:${port}/examples/tokens-plain-html.html`,
        ignoreHTTPSErrors: true,
        reuseExistingServer: false,
        timeout: 30_000,
    },
});
