import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PipelineError, fetchCommonsMetadata } from "./commons";

function metaResponse(overrides: Record<string, unknown> = {}): unknown {
    return {
        query: {
            pages: {
                "1": {
                    title: "File:probe.webm",
                    imageinfo: [
                        {
                            url: "https://upload.wikimedia.org/wikipedia/commons/x/xy/probe.webm",
                            sha1: "a".repeat(40),
                            mime: "video/webm",
                            extmetadata: {
                                Artist: { value: "<a>ProbeAuthor</a>" },
                                LicenseShortName: { value: "CC BY 3.0" },
                                LicenseUrl: {
                                    value: "https://creativecommons.org/licenses/by/3.0",
                                },
                                ImageDescription: { value: "probe" },
                            },
                            ...overrides,
                        },
                    ],
                },
            },
        },
    };
}

function fetchWith(payload: unknown): typeof fetch {
    return (async () => Response.json(payload)) as typeof fetch;
}

describe("fetchCommonsMetadata (fail closed)", () => {
    it("accepts complete metadata with an allowed licence", async () => {
        const m = await fetchCommonsMetadata(
            ["File:probe.webm"],
            fetchWith(metaResponse()),
        );
        expect(m.get("File:probe.webm")?.licence).toBe("CC BY 3.0");
    });

    it("throws when the licence field is missing", async () => {
        const payload = metaResponse({
            extmetadata: { Artist: { value: "ProbeAuthor" } },
        });
        await expect(
            fetchCommonsMetadata(["File:probe.webm"], fetchWith(payload)),
        ).rejects.toBeInstanceOf(PipelineError);
    });

    it("throws when the licence is outside the allowed set", async () => {
        const payload = metaResponse({
            extmetadata: {
                Artist: { value: "ProbeAuthor" },
                LicenseShortName: { value: "CC BY-NC 4.0" },
                LicenseUrl: {
                    value: "https://creativecommons.org/licenses/by-nc/4.0",
                },
            },
        });
        await expect(
            fetchCommonsMetadata(["File:probe.webm"], fetchWith(payload)),
        ).rejects.toBeInstanceOf(PipelineError);
    });

    it("throws when a requested title has no metadata at all", async () => {
        await expect(
            fetchCommonsMetadata(
                ["File:missing.webm"],
                fetchWith({ query: { pages: {} } }),
            ),
        ).rejects.toBeInstanceOf(PipelineError);
    });
});

describe("pipeline CLI exit code on a planted bad manifest", () => {
    it("a manifest entry with no licence exits nonzero", async () => {
        // Planted fixture: metadata without a licence. The pipeline must fail
        // closed, which the CLI maps to exit code 1.
        const fetchImpl = fetchWith(metaResponse({ extmetadata: {} }));
        const { runPipeline } = await import("./pipeline");
        const dir = mkdtempSync(join(tmpdir(), "tecken-failclosed-fixture-"));
        writeFileSync(join(dir, "irrelevant"), "");
        await expect(
            runPipeline({
                manifest: {
                    clips: [
                        {
                            id: "probe",
                            kind: "utterance",
                            title: "File:probe.webm",
                            text_sv: "probe",
                        },
                    ],
                },
                outRoot: dir,
                runDir: join(dir, "run"),
                retrievedAt: "2026-10-30",
                fetchImpl,
                ffmpeg: "false",
                ffprobe: "false",
            }),
        ).rejects.toBeInstanceOf(PipelineError);
    });
});
