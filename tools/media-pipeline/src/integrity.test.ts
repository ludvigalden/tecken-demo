import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { utteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import { ffprobeDurationSeconds } from "./pipeline";

const repoRoot = join(import.meta.dirname, "../../..");
const utterancesDir = join(repoRoot, "content/utterances");
const mediaDir = join(repoRoot, "content/media");

let ffprobe = "ffprobe";
beforeAll(() => {
    const which = spawnSync("/usr/bin/which", ["ffprobe"]);
    // Fail closed: a missing ffprobe is a failing test, not a skip.
    expect(which.status, "ffprobe must be installed").toBe(0);
    ffprobe = which.stdout.toString().trim();
    expect(ffprobe.length).toBeGreaterThan(0);
});

interface MediaRef {
    file: string;
    duration_s: number;
}

function records(): Array<{ id: string; record: Record<string, unknown> }> {
    if (!existsSync(utterancesDir)) {
        throw new Error(
            `content/utterances missing at ${utterancesDir} — run the pipeline first`,
        );
    }
    return readdirSync(utterancesDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({
            id: f.replace(/\.json$/, ""),
            record: JSON.parse(
                readFileSync(join(utterancesDir, f), "utf8"),
            ) as Record<string, unknown>,
        }));
}

describe("content integrity", () => {
    it("has exactly 39 media records and 6 link-outs", () => {
        const all = records();
        expect(all).toHaveLength(45);
        expect(all.filter((r) => r.record.kind === "link-out")).toHaveLength(6);
    });

    it(
        "every record validates against the zod schema (the JSON Schema source)",
        { timeout: 60_000 },
        () => {
            for (const { id, record } of records()) {
                const parsed = utteranceRecord.safeParse(record);
                if (!parsed.success) {
                    throw new Error(
                        `${id}: ${JSON.stringify(parsed.error.issues)}`,
                    );
                }
            }
        },
    );

    it(
        "every media record's files exist and every recorded sha256 matches",
        { timeout: 120_000 },
        () => {
            for (const { id, record } of records()) {
                if (record.kind === "link-out") {
                    continue;
                }
                const video = record.video as { file: string; sha256: string };
                const videoAlt = record.video_alt as
                    { file: string; sha256: string } | undefined;
                const poster = record.poster as
                    { file: string; sha256: string } | undefined;
                const vttFile = video.file.replace(/\.mp4$/, ".vtt");
                for (const file of [video.file, vttFile]) {
                    const path = join(repoRoot, file);
                    expect(existsSync(path), `${id}: ${file} missing`).toBe(
                        true,
                    );
                }
                for (const ref of [video, videoAlt, poster]) {
                    if (!ref) {
                        continue;
                    }
                    const path = join(repoRoot, ref.file);
                    expect(existsSync(path), `${id}: ${ref.file} missing`).toBe(
                        true,
                    );
                    const actual = createHash("sha256")
                        .update(readFileSync(path))
                        .digest("hex");
                    expect(actual, `${id}: ${ref.file} sha256 mismatch`).toBe(
                        ref.sha256,
                    );
                }
            }
        },
    );

    it(
        "every media record's MP4 and WebM durations match ffprobe within 0.1 s",
        { timeout: 300_000 },
        () => {
            for (const { id, record } of records()) {
                if (record.kind === "link-out") {
                    continue;
                }
                const refs = [record.video, record.video_alt] as Array<
                    MediaRef | undefined
                >;
                expect(refs[1], `${id}: video_alt missing`).toBeDefined();
                for (const ref of refs) {
                    if (!ref) {
                        continue;
                    }
                    const probed = ffprobeDurationSeconds(
                        ffprobe,
                        join(repoRoot, ref.file),
                    );
                    expect(
                        Math.abs(probed - ref.duration_s),
                        `${id}: ${ref.file} duration drift`,
                    ).toBeLessThan(0.1);
                }
            }
        },
    );

    it("media tree holds exactly 4 artifacts per clip (156 files)", () => {
        const files = readdirSync(mediaDir).filter((f) => f !== "REUSE.toml");
        expect(files).toHaveLength(156);
    });
});
