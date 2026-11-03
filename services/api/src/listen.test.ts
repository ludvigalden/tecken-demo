import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { get as httpGet } from "node:http";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { get as httpsGet } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { loadContent } from "./content";
import { listen } from "./listen";
import type { Listening } from "./listen";
import { CONTENT_SECURITY_POLICY } from "./security-headers";

/**
 * The CSP (and every other header) is byte-identical over http and https:
 * the TLS switch changes transport only. Both real servers are started on
 * ephemeral ports and their raw response headers compared.
 */

const repoRoot = join(import.meta.dirname, "../../..");
const certDir = mkdtempSync(join(tmpdir(), "tecken-listen-"));
const certFile = join(certDir, "cert.pem");
const servers: Listening[] = [];

function start(env: Record<string, string>): Promise<number> {
    const app = createApp({
        content: loadContent(join(repoRoot, "content/utterances")),
        webDist: certDir,
        mediaDir: join(repoRoot, "content/media"),
        storybookDir: certDir,
    });
    const transport = { ...env, HOST: "127.0.0.1", PORT: "0" };
    return new Promise((resolve) => {
        servers.push(
            listen(app.fetch, transport, (info) => {
                resolve(info.port);
            }),
        );
    });
}

function headersOf(url: string): Promise<IncomingHttpHeaders> {
    return new Promise((resolve, reject) => {
        const onResponse = (res: IncomingMessage): void => {
            res.resume();
            resolve(res.headers);
        };
        const request = url.startsWith("https")
            ? httpsGet(url, { ca: readFileSync(certFile) }, onResponse)
            : httpGet(url, onResponse);
        request.on("error", reject);
    });
}

/** Per-connection headers that legitimately differ between two requests. */
const VOLATILE = new Set(["date", "connection", "keep-alive"]);

function stable(headers: IncomingHttpHeaders): IncomingHttpHeaders {
    return Object.fromEntries(
        Object.entries(headers).filter(([name]) => !VOLATILE.has(name)),
    );
}

let httpPort = 0;
let httpsPort = 0;

beforeAll(async () => {
    // Fail closed: without openssl there is no https leg to compare.
    execFileSync(
        "/usr/bin/openssl",
        [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "1",
            "-subj",
            "/CN=localhost",
            "-addext",
            "subjectAltName=IP:127.0.0.1",
            "-keyout",
            join(certDir, "key.pem"),
            "-out",
            certFile,
        ],
        { stdio: "ignore" },
    );
    httpPort = await start({});
    httpsPort = await start({
        TLS_CERT_FILE: certFile,
        TLS_KEY_FILE: join(certDir, "key.pem"),
    });
});

afterAll(() => {
    for (const s of servers) {
        s.server.close();
    }
    rmSync(certDir, { recursive: true, force: true });
});

describe("transport", () => {
    it("serves http without TLS files and https with them", () => {
        expect.hasAssertions();
        expect(servers.map((s) => s.tls)).toEqual([false, true]);
    });

    it("sends a byte-identical CSP and header set in both modes", async () => {
        expect.hasAssertions();
        const plain = await headersOf(`http://127.0.0.1:${httpPort}/v1/health`);
        const secure = await headersOf(
            `https://127.0.0.1:${httpsPort}/v1/health`,
        );
        expect(plain["content-security-policy"]).toBe(CONTENT_SECURITY_POLICY);
        expect(secure["content-security-policy"]).toBe(
            plain["content-security-policy"],
        );
        expect(stable(secure)).toEqual(stable(plain));
    });
});
