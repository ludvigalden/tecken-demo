// Live smoke for a deployed revision: the same user journeys the CI suite
// runs (provenance badge, playback with captions, computed token colours
// and fonts, axe, zero CSP violations), plus the response headers and the
// API's schema shape, against the real URL.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { JOURNEYS, armCspCollector } from "../app/journeys.mjs";

const CSP =
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const EXPECTED_HEADERS = {
    "content-security-policy": CSP,
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cross-origin-opener-policy": "same-origin",
};

test("wake: the first request after idle returns 200, time recorded", async ({
    request,
}, info) => {
    const t0 = Date.now();
    const res = await request.get("/v1/health", { timeout: 60_000 });
    const ms = Date.now() - t0;
    info.annotations.push({
        type: "first-request-ms",
        description: String(ms),
    });
    console.log(`first /v1/health: ${res.status()} in ${ms} ms`);
    expect(res.status()).toBe(200);
});

test("headers on the page match the production policy", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const headers = res.headers();
    for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
        expect(headers[name], name).toBe(value);
    }
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["cache-control"]).toBe("no-cache");
});

test("the API answers with its schema shape", async ({ request }) => {
    const health = await request.get("/v1/health");
    expect(await health.json()).toEqual({ status: "ok" });
    const match = await request.post("/v1/match", {
        data: { text: "Jag behöver tvätta lite", mode: "suggest" },
    });
    expect(match.status()).toBe(200);
    const body = await match.json();
    expect(body.result).toBe("exact");
    const record = JSON.parse(
        readFileSync(
            join(
                import.meta.dirname,
                "../../content/utterances/jag-behover-tvatta-lite.json",
            ),
            "utf8",
        ),
    );
    expect(body.utterance.id).toBe(record.id);
    expect(body.utterance.provenance.licence).toBe(record.provenance.licence);
    const bad = await request.post("/v1/match", { data: { text: 1 } });
    expect(bad.status()).toBe(400);
    expect(bad.headers()["content-type"]).toContain("application/problem+json");
});

test("media serves byte ranges", async ({ request }) => {
    const res = await request.get("/media/hej.mp4", {
        headers: { Range: "bytes=0-99" },
    });
    expect(res.status()).toBe(206);
    expect(await res.body()).toHaveLength(100);
});

// The live smoke runs every journey except the two that intercept the
// network (they prove client states, not the deployment) and the
// screenshot writer, which never runs outside a deliberate regeneration.
const INTERCEPTING = /^state (?:loading|error):/;
for (const journey of JOURNEYS.filter((j) => !INTERCEPTING.test(j.name))) {
    test(`journey: ${journey.name}`, async ({ context, page, browserName }) => {
        const csp = await armCspCollector(context);
        await journey.run({ page, csp, browserName });
    });
}
