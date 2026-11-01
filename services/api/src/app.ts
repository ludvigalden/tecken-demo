import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import { isPlayable } from "./content";
import type { ContentIndex } from "./content";
import { exactMatch, fingerspell, isNegated, suggest } from "./matcher";
import {
    HealthSchema,
    MatchRequestSchema,
    MatchResultSchema,
    ProblemSchema,
    UtteranceListSchema,
    UtteranceSchema,
} from "./schemas";
import type { MatchResult, Problem, Utterance } from "./schemas";
import {
    CONTENT_SECURITY_POLICY,
    STATIC_SECURITY_HEADERS,
    designSystemCsp,
} from "./security-headers";

export interface AppOptions {
    content: ContentIndex;
    /** Directory with the built SPA (apps/web/dist). Optional in tests. */
    webDist?: string;
    /** Directory with content/media. */
    mediaDir?: string;
    /**
     * Built Storybook (apps/storybook/storybook-static), served under
     * /designsystem/.
     */
    storybookDir?: string;
    /**
     * Static examples (packages/design-system/examples) under /examples/
     * and the design system's built CSS under /ds/, used by the plain-HTML
     * token example.
     * Optional: the design-system test suite mounts them.
     */
    examplesDir?: string;
    designSystemDist?: string;
    /** Fixed-window rate limit. Defaults: 60 requests per 60 s per client. */
    rateLimit?: { limit: number; windowMs: number };
    /** Clock for the rate limiter (tests). */
    now?: () => number;
}

const MEDIA_PREFIX = "/media/";
const IMMUTABLE = "public, max-age=31536000, immutable";

function problem(
    c: Context,
    status: 400 | 404 | 429 | 500,
    code: Problem["code"],
    title: string,
    detail?: string,
): Response {
    const body: Problem = {
        type: "about:blank",
        title,
        status,
        code,
        ...(detail !== undefined && { detail }),
    };
    return c.body(JSON.stringify(body), status, {
        "Content-Type": "application/problem+json",
    });
}

function mediaUrl(file: string): string {
    return `${MEDIA_PREFIX}${file.replace(/^content\/media\//, "")}`;
}

export function toWire(record: UtteranceRecord): Utterance {
    const playable = isPlayable(record);
    const base: Utterance = {
        id: record.id,
        kind: record.kind,
        text_sv: record.text_sv,
        playable,
        provenance: record.provenance,
        review_status: record.review.status,
    };
    if (record.link_out_url) {
        base.link_out_url = record.link_out_url;
    }
    if (!playable || !record.video || !record.video_alt) {
        return base;
    }
    return {
        ...base,
        video: {
            url: mediaUrl(record.video.file),
            mime: record.video.mime,
            duration_s: record.video.duration_s,
            sha256: record.video.sha256,
        },
        video_alt: {
            url: mediaUrl(record.video_alt.file),
            mime: record.video_alt.mime,
            duration_s: record.video_alt.duration_s,
            sha256: record.video_alt.sha256,
        },
        ...(record.poster && { poster_url: mediaUrl(record.poster.file) }),
        captions_url: mediaUrl(record.video.file.replace(/\.mp4$/, ".vtt")),
        ...(record.caption && { caption_text: record.caption.text }),
    };
}

/** One code path sets every security header on every response. */
function securityHeaders(storybookDir: string | undefined): MiddlewareHandler {
    let scopedCsp = CONTENT_SECURITY_POLICY;
    if (storybookDir) {
        const hashesPath = join(storybookDir, "csp-hashes.json");
        if (existsSync(hashesPath)) {
            scopedCsp = designSystemCsp(
                JSON.parse(readFileSync(hashesPath, "utf8")) as {
                    scripts: string[];
                    styles: string[];
                },
            );
        }
    }
    return async (c, next) => {
        await next();
        const isDocs =
            c.req.path === "/designsystem" ||
            c.req.path.startsWith("/designsystem/");
        c.res.headers.set(
            "Content-Security-Policy",
            isDocs ? scopedCsp : CONTENT_SECURITY_POLICY,
        );
        for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
            c.res.headers.set(name, value);
        }
    };
}

/**
 * In-process fixed-window rate limit for the API. It resets whenever the
 * process restarts (scale to zero), which the threat model records.
 */
function rateLimiter(
    limit: number,
    windowMs: number,
    now: () => number,
): MiddlewareHandler {
    const windows = new Map<string, { start: number; count: number }>();
    return async (c, next) => {
        const client =
            c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
        const t = now();
        const w = windows.get(client);
        if (!w || t - w.start >= windowMs) {
            windows.set(client, { start: t, count: 1 });
        } else {
            w.count += 1;
            if (w.count > limit) {
                c.header(
                    "Retry-After",
                    String(Math.ceil((w.start + windowMs - t) / 1000)),
                );
                return problem(c, 429, "rate_limited", "Too many requests");
            }
        }
        if (windows.size > 10_000) {
            windows.clear();
        }
        await next();
        return undefined;
    };
}

function unsupported(
    content: ContentIndex,
    reason: "no_match" | "negation" | "empty",
): MatchResult {
    return {
        result: "unsupported",
        reason,
        supported: content.playable
            .filter((r) => r.kind === "utterance" || r.kind === "single-sign")
            .map((r) => r.text_sv),
        link_outs: content.linkOuts.map((r) => toWire(r)),
    };
}

export function match(
    content: ContentIndex,
    text: string,
    mode: "exact" | "suggest" | "fingerspell",
): MatchResult {
    if (text.trim() === "") {
        return unsupported(content, "empty");
    }
    // Fingerspelling mode always spells, even a word that also exists as a
    // recorded utterance ("hej"): the user asked for letter by letter.
    if (mode === "fingerspell") {
        return spellOrUnsupported(content, text);
    }
    const exact = exactMatch(text, content.playable);
    if (exact) {
        return { result: "exact", utterance: toWire(exact) };
    }
    if (mode === "suggest") {
        const suggestions = suggest(text, content.playable);
        if (suggestions.length > 0) {
            return {
                result: "suggested",
                suggestions: suggestions.map((s) => toWire(s.candidate)),
            };
        }
    }
    return spellOrUnsupported(content, text);
}

function spellOrUnsupported(content: ContentIndex, text: string): MatchResult {
    const word = text.trim();
    if (!word.includes(" ")) {
        const letters = fingerspell(word, content.letters);
        if (letters) {
            return {
                result: "fingerspelling",
                word,
                letters: letters.map((l) => toWire(l)),
            };
        }
    }
    return unsupported(content, isNegated(text) ? "negation" : "no_match");
}

function problemResponse(description: string): {
    description: string;
    content: { "application/problem+json": { schema: typeof ProblemSchema } };
} {
    return {
        description,
        content: { "application/problem+json": { schema: ProblemSchema } },
    };
}

const healthRoute = createRoute({
    operationId: "getHealth",
    method: "get",
    path: "/v1/health",
    responses: {
        200: {
            description: "The process is up. Performs no I/O.",
            content: { "application/json": { schema: HealthSchema } },
        },
    },
});

const listRoute = createRoute({
    operationId: "listUtterances",
    method: "get",
    path: "/v1/utterances",
    responses: {
        200: {
            description: "Every content record, playable or not.",
            content: { "application/json": { schema: UtteranceListSchema } },
        },
        429: problemResponse("Rate limited"),
    },
});

const getRoute = createRoute({
    operationId: "getUtterance",
    method: "get",
    path: "/v1/utterances/{id}",
    request: {
        params: z
            .object({
                id: z
                    .string()
                    .regex(/^[a-z0-9][a-z0-9-]{0,63}$/)
                    .openapi({ param: { name: "id", in: "path" } }),
            })
            .strict(),
    },
    responses: {
        200: {
            description: "One content record.",
            content: { "application/json": { schema: UtteranceSchema } },
        },
        400: problemResponse("Invalid id"),
        404: problemResponse("No such record"),
        429: problemResponse("Rate limited"),
    },
});

const matchRoute = createRoute({
    operationId: "matchPhrase",
    method: "post",
    path: "/v1/match",
    request: {
        body: {
            required: true,
            content: { "application/json": { schema: MatchRequestSchema } },
        },
    },
    responses: {
        200: {
            description: "The match outcome.",
            content: { "application/json": { schema: MatchResultSchema } },
        },
        400: problemResponse("Invalid request body"),
        429: problemResponse("Rate limited"),
    },
});

export function createApp(options: AppOptions): OpenAPIHono {
    const { content } = options;
    const app = new OpenAPIHono({
        defaultHook: (result, c) => {
            if (!result.success) {
                return problem(
                    c,
                    400,
                    "invalid_request",
                    "Invalid request",
                    result.error.issues
                        .map(
                            (i) =>
                                `${i.path.join(".") || "(body)"}: ${i.message}`,
                        )
                        .join("; "),
                );
            }
            return undefined;
        },
    });

    app.use("*", securityHeaders(options.storybookDir));

    app.onError((err, c) => {
        // Hono raises HTTPException for client faults it detects itself
        // (malformed JSON bodies): keep their 4xx, never surface a stack.
        if (err instanceof HTTPException && err.status === 400) {
            return problem(c, 400, "invalid_request", "Malformed request body");
        }
        return problem(c, 500, "internal_error", "Internal error");
    });
    app.notFound((c) =>
        c.req.path.startsWith("/v1/")
            ? problem(c, 404, "not_found", "Not found")
            : c.text("Not found", 404),
    );

    // Body size guard ahead of JSON parsing: an oversized body never parses.
    app.use("/v1/*", async (c, next) => {
        const length = Number(c.req.header("content-length") ?? "0");
        if (length > 4096) {
            return problem(c, 400, "invalid_request", "Request body too large");
        }
        await next();
        return undefined;
    });
    const { limit = 60, windowMs = 60_000 } = options.rateLimit ?? {};
    app.use(
        "/v1/utterances",
        rateLimiter(limit, windowMs, options.now ?? Date.now),
    );
    app.use(
        "/v1/utterances/*",
        rateLimiter(limit, windowMs, options.now ?? Date.now),
    );
    app.use("/v1/match", rateLimiter(limit, windowMs, options.now ?? Date.now));

    app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }, 200));

    app.openapi(listRoute, (c) =>
        c.json({ items: content.all.map((r) => toWire(r)) }, 200),
    );

    app.openapi(getRoute, (c) => {
        const record = content.byId.get(c.req.valid("param").id);
        if (!record) {
            const body: Problem = {
                type: "about:blank",
                title: "No such record",
                status: 404,
                code: "not_found",
            };
            return c.json(body, 404, {
                "Content-Type": "application/problem+json",
            });
        }
        return c.json(toWire(record), 200);
    });

    app.openapi(matchRoute, (c) => {
        const { text, mode } = c.req.valid("json");
        return c.json(match(content, text, mode), 200);
    });

    if (options.mediaDir) {
        const mediaDir = options.mediaDir;
        app.use(`${MEDIA_PREFIX}*`, async (c, next) => {
            await next();
            if (c.res.ok || c.res.status === 206) {
                c.res.headers.set("Cache-Control", IMMUTABLE);
                // Advertise byte ranges on the full response too: WebKit's
                // media loader decides whether to stream from this header on
                // the first (non-ranged) response.
                c.res.headers.set("Accept-Ranges", "bytes");
                // Hono's MIME table has no .vtt entry, and under nosniff a
                // caption file served as application/octet-stream is never
                // parsed (WebKit drops the track), so set it explicitly.
                if (c.req.path.endsWith(".vtt")) {
                    c.res.headers.set(
                        "Content-Type",
                        "text/vtt; charset=utf-8",
                    );
                }
            }
        });
        app.use(
            `${MEDIA_PREFIX}*`,
            serveStatic({
                root: mediaDir,
                rewriteRequestPath: (p) => p.slice(MEDIA_PREFIX.length - 1),
            }),
        );
    }

    if (options.storybookDir) {
        const storybookDir = options.storybookDir;
        app.get("/designsystem", (c) => c.redirect("/designsystem/", 301));
        app.use(
            "/designsystem/*",
            serveStatic({
                root: storybookDir,
                rewriteRequestPath: (p) => p.replace(/^\/designsystem/, ""),
            }),
        );
    }

    if (options.examplesDir) {
        const examplesDir = options.examplesDir;
        app.use(
            "/examples/*",
            serveStatic({
                root: examplesDir,
                rewriteRequestPath: (p) => p.replace(/^\/examples/, ""),
            }),
        );
    }
    if (options.designSystemDist) {
        const designSystemDist = options.designSystemDist;
        app.use(
            "/ds/*",
            serveStatic({
                root: designSystemDist,
                rewriteRequestPath: (p) => p.replace(/^\/ds/, ""),
            }),
        );
    }

    if (options.webDist) {
        const webDist = options.webDist;
        app.use("/assets/*", async (c, next) => {
            await next();
            if (c.res.ok) {
                c.res.headers.set("Cache-Control", IMMUTABLE);
            }
        });
        // index.html is never cached, so a deploy is picked up immediately.
        app.use("*", async (c, next) => {
            await next();
            const type = c.res.headers.get("Content-Type") ?? "";
            if (type.startsWith("text/html")) {
                c.res.headers.set("Cache-Control", "no-cache");
            }
        });
        // Hashed assets ship with .br/.gz siblings written at build time.
        app.use("/*", serveStatic({ root: webDist, precompressed: true }));
        // SPA fallback: unknown non-API, non-file paths get index.html.
        const indexHtml = join(webDist, "index.html");
        app.get("*", (c) => {
            if (!existsSync(indexHtml)) {
                return c.text("Not found", 404);
            }
            c.header("Cache-Control", "no-cache");
            return c.html(readFileSync(indexHtml, "utf8"));
        });
    }

    return app;
}

export const OPENAPI_INFO: Parameters<OpenAPIHono["getOpenAPI31Document"]>[0] =
    {
        openapi: "3.1.0",
        info: {
            title: "Tecken API",
            version: "0.1.0",
            description:
                "Looks up supported Swedish phrases and returns recorded Swedish Sign Language clips with their provenance. It translates nothing and generates nothing.",
            license: { name: "MIT", url: "https://opensource.org/license/mit" },
        },
        // One origin serves the SPA, the media and the API.
        servers: [{ url: "/", description: "Same origin as the web app" }],
    };
