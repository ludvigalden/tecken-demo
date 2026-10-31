// Builds the design system's shippable artifacts:
//  - dist/tokens.css, dist/fkui-theme.css (from src/generated, itself gated)
//  - dist/components.css (compiled from the component SCSS)
//  - dist/components/ — the Vue SFC sources, for the consumer's bundler
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as sass from "sass";

const root = join(import.meta.dirname, "..");
const src = join(root, "src");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "components"), { recursive: true });

for (const f of ["tokens.css", "fkui-theme.css"]) {
    cpSync(join(src, "generated", f), join(dist, f));
}

const compiled = sass.compile(join(src, "components/components.scss"), {
    style: "expanded",
});
writeFileSync(join(dist, "components.css"), compiled.css);

for (const f of readdirSync(join(src, "components"))) {
    if (f.endsWith(".vue")) {
        cpSync(join(src, "components", f), join(dist, "components", f));
    }
}
console.log("design-system built");
