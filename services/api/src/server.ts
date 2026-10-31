import { readFileSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadContent } from "./content";

/**
 * Node entry. Plain http on PORT (default 8080) in production, where the
 * Container Apps ingress terminates TLS. When TLS_CERT_FILE and TLS_KEY_FILE
 * are both set (local and CI test runs), it serves https on PORT (default
 * 8443) instead. The transport is the only difference; headers are identical.
 */

const root = process.env.TECKEN_ROOT ?? process.cwd();
const content = loadContent(join(root, "content/utterances"));
// TECKEN_EXAMPLES=1 also mounts the design-system examples and CSS, for
// the design-system test suite. Production never sets it.
const withExamples = process.env.TECKEN_EXAMPLES === "1";
const app = createApp({
    content,
    webDist: join(root, "apps/web/dist"),
    mediaDir: join(root, "content/media"),
    storybookDir: join(root, "apps/storybook/storybook-static"),
    ...(withExamples && {
        examplesDir: join(root, "packages/design-system/examples"),
        designSystemDist: join(root, "packages/design-system/dist"),
    }),
});

const cert = process.env.TLS_CERT_FILE;
const key = process.env.TLS_KEY_FILE;
const tls = Boolean(cert && key);
const port = Number(process.env.PORT ?? (tls ? 8443 : 8080));
const hostname = process.env.HOST ?? "0.0.0.0";

serve(
    tls && cert && key
        ? {
              fetch: app.fetch,
              port,
              hostname,
              createServer: createHttpsServer,
              serverOptions: {
                  cert: readFileSync(cert),
                  key: readFileSync(key),
              },
          }
        : { fetch: app.fetch, port, hostname },
    (info) => {
        console.log(
            `tecken api listening ${tls ? "https" : "http"} ${hostname}:${info.port} (${content.all.length} records)`,
        );
    },
);
