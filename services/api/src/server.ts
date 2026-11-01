import { join } from "node:path";
import { createApp } from "./app";
import { loadContent } from "./content";
import { listen } from "./listen";

/** Node entry; the transport rules live in listen.ts. */

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

listen(app.fetch, process.env, ({ port, tls }) => {
    const hostname = process.env.HOST ?? "0.0.0.0";
    console.log(
        `tecken api listening ${tls ? "https" : "http"} ${hostname}:${port} (${content.all.length} records)`,
    );
});
