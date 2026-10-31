// Test harness for the design-system checks: serves the Storybook build
// under /designsystem/ (path-scoped CSP) and the design-system examples under
// /examples/ (base CSP), over local TLS, with the production header policy.
// Usage: TLS_CERT_FILE=… TLS_KEY_FILE=… PORT=8443 node tests/design-system/server.mjs
import { readFileSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import {
    CONTENT_SECURITY_POLICY,
    STATIC_SECURITY_HEADERS,
    designSystemCsp,
} from "../../services/api/dist/security-headers.js";

const repoRoot = join(import.meta.dirname, "../..");
const storybookDir = join(repoRoot, "apps/storybook/storybook-static");
const hashes = JSON.parse(
    readFileSync(join(storybookDir, "csp-hashes.json"), "utf8"),
);
const scopedCsp = designSystemCsp(hashes);

const app = new Hono();
app.use("*", async (c, next) => {
    await next();
    const csp = c.req.path.startsWith("/designsystem/")
        ? scopedCsp
        : CONTENT_SECURITY_POLICY;
    c.header("Content-Security-Policy", csp);
    for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
        c.header(name, value);
    }
});
app.use(
    "/designsystem/*",
    serveStatic({
        root: storybookDir,
        rewriteRequestPath: (p) => p.replace(/^\/designsystem/, ""),
    }),
);
app.use(
    "/examples/*",
    serveStatic({
        root: join(repoRoot, "packages/design-system/examples"),
        rewriteRequestPath: (p) => p.replace(/^\/examples/, ""),
    }),
);
app.use(
    "/ds/*",
    serveStatic({
        root: join(repoRoot, "packages/design-system/dist"),
        rewriteRequestPath: (p) => p.replace(/^\/ds/, ""),
    }),
);

const cert = process.env.TLS_CERT_FILE;
const key = process.env.TLS_KEY_FILE;
if (!cert || !key) {
    // Fail closed: the harness never serves plain http.
    throw new Error(
        "TLS_CERT_FILE and TLS_KEY_FILE are required for the test harness",
    );
}
const port = Number(process.env.PORT ?? 8443);
serve(
    {
        fetch: app.fetch,
        port,
        hostname: "127.0.0.1",
        createServer: createHttpsServer,
        serverOptions: { cert: readFileSync(cert), key: readFileSync(key) },
    },
    (info) => console.log(`harness listening https ${info.port}`),
);
