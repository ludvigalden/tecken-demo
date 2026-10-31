// Fails if any public package tarball contains a file outside the allowlist.
// Usage: node -I tools/ci/check-pack.mjs <workspace-dir>...
import { execFileSync } from "node:child_process";

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
        "npm",
        ["pack", "--dry-run", "--json", "--ignore-scripts"],
        {
            cwd: dir,
            encoding: "utf8",
        },
    );
    const [entry] = JSON.parse(out);
    const files = entry.files.map((f) => f.path);
    const bad = files.filter((p) => !allowed.some((re) => re.test(p)));
    console.log(`${entry.name}@${entry.version}: ${files.length} files`);
    for (const p of files)
        console.log(`  ${bad.includes(p) ? "DISALLOWED" : "ok"} ${p}`);
    if (bad.length > 0) failed += 1;
}

if (failed > 0) {
    console.error(`check-pack: ${failed} package(s) contain disallowed files`);
    process.exit(1);
}
console.log("check-pack: all tarballs within the allowlist");
