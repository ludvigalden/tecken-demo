import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { readContentIndex } from "./content";
import { listen } from "./listen";

/** Node entry; the transport rules live in listen.ts. */

const root = process.env.TECKEN_ROOT ?? process.cwd();
// The validated content index is prebuilt next to the bundle at build time.
const content = readContentIndex(
    fileURLToPath(new URL("content-index.json", import.meta.url)),
);
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

listen(app.fetch, process.env, ({ port, tls }) => {
    const hostname = process.env.HOST ?? "0.0.0.0";
    console.log(
        `tecken api listening ${tls ? "https" : "http"} ${hostname}:${port} (${content.all.length} records)`,
    );
});
