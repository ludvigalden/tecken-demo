import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PipelineError } from "./commons";
import { runPipeline } from "./pipeline";
import type { Manifest } from "./pipeline";

function main(argv: string[]): number {
    const { values } = parseArgs({
        args: argv,
        options: {
            manifest: {
                type: "string",
                default: "tools/media-pipeline/manifest.json",
            },
            "out-root": { type: "string", default: "." },
            "run-dir": { type: "string" },
            "retrieved-at": {
                type: "string",
                default: new Date().toISOString().slice(0, 10),
            },
        },
    });
    const runDir = values["run-dir"];
    if (!runDir) {
        console.error(
            "--run-dir is required (originals are never written into the repo)",
        );
        return 2;
    }
    const manifest = JSON.parse(
        readFileSync(resolve(values.manifest ?? ""), "utf8"),
    ) as Manifest;
    runPipeline({
        manifest,
        outRoot: resolve(values["out-root"] ?? "."),
        runDir: resolve(runDir),
        retrievedAt: values["retrieved-at"] ?? "",
    })
        .then((code) => {
            process.exitCode = code;
        })
        .catch((error: unknown) => {
            if (error instanceof PipelineError) {
                console.error(`pipeline: ${error.message}`);
            } else {
                console.error(error);
            }
            process.exitCode = 1;
        });
    return 0;
}

main(process.argv.slice(2));
