import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { utteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import { createApp } from "./app";
import { buildIndex, isPlayable, loadContent } from "./content";
import type { ContentIndex } from "./content";
import { CONTENT_SECURITY_POLICY } from "./security-headers";

/**
 * Integration tests against the real Node app (app.request(), no network),
 * with the real committed content, media and a stub SPA + Storybook build.
 */

const repoRoot = join(import.meta.dirname, "../../..");
const ASSET_SOURCE = `export const app = "${"tecken ".repeat(200)}";\n`;
let content: ContentIndex;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
    content = loadContent(join(repoRoot, "content/utterances"));
    const web = mkdtempSync(join(tmpdir(), "tecken-web-"));
    writeFileSync(
        join(web, "index.html"),
        "<!doctype html><title>t</title><main></main>",
    );
    mkdirSync(join(web, "assets"));
    writeFileSync(join(web, "assets/app-abc.js"), ASSET_SOURCE);
    writeFileSync(
        join(web, "assets/app-abc.js.br"),
        brotliCompressSync(ASSET_SOURCE),
    );
    const sb = mkdtempSync(join(tmpdir(), "tecken-sb-"));
    writeFileSync(join(sb, "index.html"), "<!doctype html><title>sb</title>");
    writeFileSync(
        join(sb, "csp-hashes.json"),
        JSON.stringify({ scripts: ["abc="], styles: ["def="] }),
    );
    app = createApp({
        content,
        webDist: web,
        mediaDir: join(repoRoot, "content/media"),
        storybookDir: sb,
    });
});

async function postMatch(body: unknown): Promise<Response> {
    return app.request("/v1/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function realRecord(): UtteranceRecord {
    const r = content.byId.get("hej");
    if (!r) {
        throw new Error("fixture record hej missing");
    }
    return r;
}

describe("matching", () => {
    it("returns the exact utterance for a normalised phrase", async () => {
        expect.hasAssertions();
        const res = await postMatch({
            text: "Jag behöver tvätta lite!",
            mode: "exact",
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            result: string;
            utterance: { id: string; playable: boolean };
        };
        expect(body.result).toBe("exact");
        expect(body.utterance.id).toBe("jag-behover-tvatta-lite");
        expect(body.utterance.playable).toBe(true);
    });

    it("a negated input never matches or is offered its positive utterance", async () => {
        expect.hasAssertions();
        for (const text of [
            "jag behöver inte tvätta lite",
            "jag behöver ej tvätta lite",
            "jag behöver aldrig tvätta lite",
        ]) {
            for (const mode of ["exact", "suggest"]) {
                const res = await postMatch({ text, mode });
                const body = (await res.json()) as {
                    result: string;
                    reason?: string;
                };
                expect(body.result, `${text} (${mode})`).toBe("unsupported");
                expect(body.reason).toBe("negation");
            }
        }
    });

    it("suggests a near match in suggest mode only", async () => {
        expect.hasAssertions();
        const s = (await (
            await postMatch({ text: "jag behöver tvätta", mode: "suggest" })
        ).json()) as {
            result: string;
            suggestions: Array<{ id: string }>;
        };
        expect(s.result).toBe("suggested");
        expect(s.suggestions[0]?.id).toBe("jag-behover-tvatta-lite");
        const e = (await (
            await postMatch({ text: "jag behöver tvätta", mode: "exact" })
        ).json()) as {
            result: string;
        };
        expect(e.result).toBe("unsupported");
    });

    it("fingerspells a single unknown word letter by letter", async () => {
        expect.hasAssertions();
        const body = (await (
            await postMatch({ text: "Åsa", mode: "exact" })
        ).json()) as {
            result: string;
            letters: Array<{ id: string }>;
        };
        expect(body.result).toBe("fingerspelling");
        expect(body.letters.map((l) => l.id)).toEqual([
            "letter-aring",
            "letter-s",
            "letter-a",
        ]);
    });

    it("lists what is supported and the link-outs when unsupported", async () => {
        expect.hasAssertions();
        const body = (await (
            await postMatch({ text: "hur mår du idag", mode: "suggest" })
        ).json()) as {
            result: string;
            supported: string[];
            link_outs: Array<{ link_out_url: string; playable: boolean }>;
        };
        expect(body.result).toBe("unsupported");
        expect(body.supported).toContain("hej");
        expect(body.link_outs).toHaveLength(6);
        expect(
            body.link_outs.every(
                (l) =>
                    !l.playable &&
                    l.link_out_url.startsWith(
                        "https://teckensprakslexikon.su.se/ord/",
                    ),
            ),
        ).toBe(true);
    });
});

describe("rights and review", () => {
    const real = realRecord;

    it("a record with unknown rights is not playable", () => {
        expect.hasAssertions();
        const { rights: _drop, ...noRights } = real();
        expect(isPlayable(real())).toBe(true);
        expect(isPlayable(noRights)).toBe(false);
        const index = buildIndex([noRights]);
        expect(index.playable).toEqual([]);
    });

    it("a record whose rights disagree with its provenance is not playable", () => {
        expect.hasAssertions();
        const r = real();
        const mismatched: UtteranceRecord = {
            ...r,
            rights: {
                code: "MIT",
                data: "CC-BY-4.0",
                media: "CC BY-SA 3.0",
                output: "CC-BY-4.0",
            },
        };
        expect(mismatched.rights?.media).not.toBe(r.provenance.licence);
        expect(isPlayable(mismatched)).toBe(false);
    });

    it("an unplayable record is served without media URLs", async () => {
        expect.hasAssertions();
        const { rights: _drop, ...noRights } = real();
        const bare = createApp({ content: buildIndex([noRights]) });
        const body = (await (
            await bare.request("/v1/utterances/hej")
        ).json()) as {
            playable: boolean;
            video?: unknown;
        };
        expect(body.playable).toBe(false);
        expect(body.video).toBeUndefined();
    });

    it("reviewed without a reviewer fails validation", () => {
        expect.hasAssertions();
        const bad = { ...real(), review: { status: "reviewed" } };
        expect(utteranceRecord.safeParse(bad).success).toBe(false);
    });
});

describe("boundary", () => {
    it("an oversized text returns 400 problem+json", async () => {
        expect.hasAssertions();
        const res = await postMatch({ text: "a".repeat(201), mode: "exact" });
        expect(res.status).toBe(400);
        expect(res.headers.get("content-type")).toContain(
            "application/problem+json",
        );
        const body = (await res.json()) as { code: string; status: number };
        expect(body).toMatchObject({ code: "invalid_request", status: 400 });
    });

    it("an oversized body is rejected before parsing", async () => {
        expect.hasAssertions();
        const res = await app.request("/v1/match", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": "100000",
            },
            body: JSON.stringify({ text: "hej", mode: "exact" }),
        });
        expect(res.status).toBe(400);
        expect(res.headers.get("content-type")).toContain(
            "application/problem+json",
        );
    });

    it("unknown keys, a wrong mode and malformed JSON return 400 problem+json without a stack", async () => {
        expect.hasAssertions();
        for (const body of [
            { text: "hej", mode: "exact", extra: 1 },
            { text: "hej", mode: "fuzzy" },
            {},
        ]) {
            const res = await postMatch(body);
            expect(res.status).toBe(400);
            const text = await res.text();
            expect(text).not.toMatch(/at \w+ \(|node_modules/);
        }
        const malformed = await app.request("/v1/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{not json",
        });
        expect(malformed.status).toBe(400);
        expect(malformed.headers.get("content-type")).toContain(
            "application/problem+json",
        );
    });

    it("an unknown id returns 404 problem+json", async () => {
        expect.hasAssertions();
        const res = await app.request("/v1/utterances/finns-inte");
        expect(res.status).toBe(404);
        expect(res.headers.get("content-type")).toContain(
            "application/problem+json",
        );
    });

    it("rate-limits the API per client in a fixed window", async () => {
        expect.hasAssertions();
        let t = 0;
        const limited = createApp({
            content,
            rateLimit: { limit: 2, windowMs: 1000 },
            now: () => t,
        });
        const hit = async (): Promise<Response> =>
            limited.request("/v1/utterances", {
                headers: { "X-Forwarded-For": "203.0.113.9" },
            });
        expect((await hit()).status).toBe(200);
        expect((await hit()).status).toBe(200);
        const third = await hit();
        expect(third.status).toBe(429);
        expect(third.headers.get("content-type")).toContain(
            "application/problem+json",
        );
        t = 1000;
        expect((await hit()).status).toBe(200);
    });

    it("health does no I/O and always answers", async () => {
        expect.hasAssertions();
        const bare = createApp({ content: buildIndex([]) });
        const res = await bare.request("/v1/health");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok" });
    });
});

describe("headers and static serving", () => {
    const expected = {
        "content-security-policy": CONTENT_SECURITY_POLICY,
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "permissions-policy":
            "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "cross-origin-opener-policy": "same-origin",
    };

    it.each([
        ["/", "GET"],
        ["/media/hej.mp4", "GET"],
        ["/v1/match", "POST"],
        ["/v1/health", "GET"],
        ["/v1/does-not-exist", "GET"],
    ])("sets every security header on %s", async (path, method) => {
        expect.hasAssertions();
        const res = await app.request(path, {
            method,
            ...(method === "POST" && {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: "hej", mode: "exact" }),
            }),
        });
        for (const [name, value] of Object.entries(expected)) {
            expect(res.headers.get(name), `${path} ${name}`).toBe(value);
        }
    });

    it("sets the path-scoped CSP and the other headers on /designsystem/", async () => {
        expect.hasAssertions();
        const res = await app.request("/designsystem/");
        expect(res.status).toBe(200);
        const csp = res.headers.get("content-security-policy") ?? "";
        expect(csp).toContain("script-src 'self' 'sha256-abc='");
        expect(csp).toContain("frame-ancestors 'self'");
        expect(csp).not.toMatch(/unsafe-/);
        for (const [name, value] of Object.entries(expected)) {
            if (name !== "content-security-policy") {
                expect(res.headers.get(name), name).toBe(value);
            }
        }
    });

    it("a Range request on a media file returns 206 with the requested bytes", async () => {
        expect.hasAssertions();
        const res = await app.request("/media/hej.mp4", {
            headers: { Range: "bytes=0-99" },
        });
        expect(res.status).toBe(206);
        expect(res.headers.get("content-range")).toMatch(/^bytes 0-99\/\d+$/);
        expect((await res.arrayBuffer()).byteLength).toBe(100);
        expect(res.headers.get("cache-control")).toContain("immutable");
    });

    it("serves captions as text/vtt (nosniff would otherwise drop the track)", async () => {
        expect.hasAssertions();
        const res = await app.request("/media/hej.vtt");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("text/vtt; charset=utf-8");
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
        expect(await res.text()).toMatch(/^WEBVTT/);
    });

    it("serves the SPA shell with no-cache for client routes", async () => {
        expect.hasAssertions();
        const res = await app.request("/fingerstavning");
        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-cache");
        expect(await res.text()).toContain("<main>");
        const root = await app.request("/");
        expect(root.status).toBe(200);
        expect(root.headers.get("cache-control")).toBe("no-cache");
    });

    it("serves a hashed asset's precompressed sibling when the client accepts it", async () => {
        expect.hasAssertions();
        const br = await app.request("/assets/app-abc.js", {
            headers: { "Accept-Encoding": "gzip, br" },
        });
        expect(br.status).toBe(200);
        expect(br.headers.get("content-encoding")).toBe("br");
        expect(br.headers.get("vary")).toContain("Accept-Encoding");
        expect(br.headers.get("content-type")).toMatch(/^text\/javascript/);
        expect(br.headers.get("cache-control")).toBe(
            "public, max-age=31536000, immutable",
        );
        expect(br.headers.get("content-security-policy")).toBe(
            CONTENT_SECURITY_POLICY,
        );
        const body = Buffer.from(await br.arrayBuffer());
        expect(body.length).toBeLessThan(ASSET_SOURCE.length);
        expect(brotliDecompressSync(body).toString()).toBe(ASSET_SOURCE);
    });

    it("serves the plain asset to a client that accepts no compression", async () => {
        expect.hasAssertions();
        const plain = await app.request("/assets/app-abc.js");
        expect(plain.status).toBe(200);
        expect(plain.headers.get("content-encoding")).toBeNull();
        expect(await plain.text()).toBe(ASSET_SOURCE);
    });
});
