// Computes sha256 hashes of every inline <script> and <style> body in the
// Storybook build, for the path-scoped /designsystem/ CSP. Writes
// storybook-static/csp-hashes.json. Run after `storybook build`.
// Usage: node apps/storybook/scripts/csp-hashes.mjs [storybook-static-dir]
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? join(import.meta.dirname, "../storybook-static");

function inlineBodies(html, tag) {
    const re = new RegExp(
        `<${tag}(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)</${tag}>`,
        "g",
    );
    return [...html.matchAll(re)].map((m) => m[1]);
}

const scripts = new Set();
const styles = new Set();
for (const f of readdirSync(dir).filter((n) => n.endsWith(".html"))) {
    const html = readFileSync(join(dir, f), "utf8");
    for (const body of inlineBodies(html, "script")) {
        scripts.add(createHash("sha256").update(body).digest("base64"));
    }
    for (const body of inlineBodies(html, "style")) {
        styles.add(createHash("sha256").update(body).digest("base64"));
    }
}

const out = {
    scripts: [...scripts].toSorted((a, b) => a.localeCompare(b)),
    styles: [...styles].toSorted((a, b) => a.localeCompare(b)),
};
writeFileSync(
    join(dir, "csp-hashes.json"),
    `${JSON.stringify(out, null, 4)}\n`,
);
console.log(
    `csp-hashes: ${out.scripts.length} scripts, ${out.styles.length} styles`,
);
