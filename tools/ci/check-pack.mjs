// Fails if any public package tarball contains a file outside the allowlist.
// Usage: node tools/ci/check-pack.mjs <workspace-dir>...
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Run the npm CLI that ships with the running Node (fixed path next to the
// node binary), not whatever `npm` the PATH resolves to.
const npmCli = join(
    process.execPath,
    "../../lib/node_modules/npm/bin/npm-cli.js",
);

const allowed = [
    /^dist\//,
    /^README\.md$/,
    /^LICENSE$/,
    /^package\.json$/,
    /^CHANGELOG\.md$/,
];
let failed = 0;

for (const dir of process.argv.slice(2)) {
    const out = execFileSync(
        process.execPath,
        [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"],
        { cwd: dir, encoding: "utf8" },
    );
    const [entry] = JSON.parse(out);
    const files = entry.files.map((f) => f.path);
    const bad = files.filter((p) => !allowed.some((re) => re.test(p)));
    console.log(`${entry.name}@${entry.version}: ${files.length} files`);
    for (const p of files) {
        console.log(`  ${bad.includes(p) ? "DISALLOWED" : "ok"} ${p}`);
    }
    if (bad.length > 0) {
        failed += 1;
    }
}

if (failed > 0) {
    console.error(`check-pack: ${failed} package(s) contain disallowed files`);
    process.exitCode = 1;
} else {
    console.log("check-pack: all tarballs within the allowlist");
}
