import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { utteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import { PipelineError, fetchCommonsMetadata } from "./commons";
import type { CommonsMetadata } from "./commons";

export interface ManifestEntry {
    id: string;
    kind: "utterance" | "single-sign" | "fingerspelling-letter";
    title: string;
    text_sv: string;
}

export interface Manifest {
    clips: ManifestEntry[];
}

export interface LinkOutFixture {
    ord: string;
    word: string;
    title: string;
}

/** The six lexicon link-outs, live-verified into tools/media-pipeline/link-outs.json. */
export const LEXIKON_ATTRIBUTION =
    "Svenskt teckenspråkslexikon, Avdelningen för teckenspråk, Institutionen för lingvistik, Stockholms universitet";

/**
 * Commons' VRT ticket for the Spread the Sign cooperation
 * (Template:STS-cooperation), live-verified 2026-10-30. Only the
 * Spread the Sign records carry it.
 */
export const STS_VRT_TICKET = "2013091910008774";

/** The caption text for a clip: the Swedish gloss for spoken content,
 * the Swedish letter title for the manual alphabet. Never the English
 * "… in swedish sign language" descriptions. */
export function captionTextFor(
    clip: ManifestEntry,
    description: string,
): string {
    if (
        clip.kind === "fingerspelling-letter" &&
        description.startsWith("Bokstaven ")
    ) {
        return description;
    }
    return clip.text_sv;
}

export function loadLinkOutFixture(
    path: string,
): Array<LinkOutFixture & { id: string }> {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
        link_outs: LinkOutFixture[];
    };
    return raw.link_outs.map((l) => ({
        ...l,
        id: `lexikon-${l.word
            .replaceAll(/[äåö]/g, "a")
            .replaceAll(/[^a-z]/g, "")}`,
    }));
}

function sha256File(path: string): string {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(tool: string, args: string[]): void {
    const r = spawnSync(tool, args, { stdio: ["ignore", "ignore", "pipe"] });
    if (r.status !== 0) {
        throw new PipelineError(
            `${tool} ${args.join(" ")} failed with exit ${r.status}: ${r.stderr?.toString() ?? ""}`,
        );
    }
}

export function ffprobeDurationSeconds(ffprobe: string, file: string): number {
    const r = spawnSync(ffprobe, [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
    ]);
    if (r.status !== 0 || !r.stdout) {
        throw new PipelineError(`ffprobe failed for ${file}`);
    }
    return Number(r.stdout.toString().trim());
}

function publisherFor(meta: CommonsMetadata): string {
    if (meta.author === "Spread the Sign") {
        return "Spread the Sign";
    }
    return "Wikimedia Commons";
}

function vttTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export function vttFor(text: string, durationS: number): string {
    return `WEBVTT\n\n1\n${vttTimestamp(0)} --> ${vttTimestamp(durationS)}\n${text}\n`;
}

/** Writes the six lexicon link-out records (no media, no download). */
export function writeLinkOuts(
    outRoot: string,
    retrievedAt: string,
    fixturePath = join(import.meta.dirname, "../link-outs.json"),
): void {
    const dir = join(outRoot, "content/utterances");
    mkdirSync(dir, { recursive: true });
    for (const l of loadLinkOutFixture(fixturePath)) {
        const url = `https://teckensprakslexikon.su.se/ord/${l.ord}`;
        const record = {
            id: l.id,
            kind: "link-out",
            text_sv: l.word,
            sts_variant: l.word.toUpperCase(),
            link_out_url: url,
            provenance: {
                source_title: `Svenskt teckenspråkslexikon: ${l.title}`,
                source_url: url,
                source_file_url: url,
                author: LEXIKON_ATTRIBUTION,
                signer: null,
                publisher: "Stockholms universitet",
                licence: "CC BY-NC-SA 4.0",
                licence_url:
                    "https://creativecommons.org/licenses/by-nc-sa/4.0/",
                retrieved_at: retrievedAt,
                permission_ticket: null,
            },
            review: { status: "source-published" },
        };
        utteranceRecord.parse(record);
        writeFileSync(
            join(dir, `${l.id}.json`),
            `${JSON.stringify(record, null, 4)}\n`,
        );
    }
}

export interface PipelineOptions {
    manifest: Manifest;
    outRoot: string;
    runDir: string;
    retrievedAt: string;
    fetchImpl?: typeof fetch;
    ffmpeg?: string;
    ffprobe?: string;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function downloadOriginal(
    url: string,
    destination: string,
    fetchImpl: typeof fetch,
): Promise<void> {
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetchImpl(url, {
            headers: { "User-Agent": "tecken-demo-media-pipeline/0.1" },
        });
        if (res.ok) {
            writeFileSync(destination, Buffer.from(await res.arrayBuffer()));
            return;
        }
        if (res.status === 429 || res.status >= 500) {
            const retryAfter = Number(res.headers.get("retry-after") ?? "0");
            const waitMs = Math.max(
                retryAfter * 1000,
                2000 * 2 ** (attempt - 1),
            );
            console.error(
                `download ${res.status} for ${url}; retrying in ${waitMs}ms (attempt ${attempt}/${maxAttempts})`,
            );
            await sleep(waitMs);
            continue;
        }
        throw new PipelineError(
            `download failed for ${url}: HTTP ${res.status}`,
        );
    }
    throw new PipelineError(
        `download failed for ${url}: giving up after ${maxAttempts} attempts`,
    );
}

/**
 * Fetches metadata (fail closed), downloads originals into runDir, transcodes
 * unmodified (no crop/trim/overlay) to H.264 MP4 (+faststart) and VP9 WebM,
 * extracts a WebP poster, hashes everything, and writes the content tree.
 */
export async function runPipeline(options: PipelineOptions): Promise<number> {
    const { manifest, outRoot, runDir, retrievedAt } = options;
    const ffmpeg = options.ffmpeg ?? "ffmpeg";
    const ffprobe = options.ffprobe ?? "ffprobe";
    const meta = await fetchCommonsMetadata(
        manifest.clips.map((c) => c.title),
        options.fetchImpl,
    );

    mkdirSync(join(outRoot, "content/media"), { recursive: true });
    mkdirSync(join(outRoot, "content/utterances"), { recursive: true });
    mkdirSync(runDir, { recursive: true });

    const reuseMedia: string[] = [];
    const spdxByLicence: Record<string, string> = {
        "CC BY 3.0": "CC-BY-3.0",
        "CC BY 4.0": "CC-BY-4.0",
        "CC BY-SA 3.0": "CC-BY-SA-3.0",
        "CC BY-SA 4.0": "CC-BY-SA-4.0",
    };

    for (const clip of manifest.clips) {
        const m = meta.get(clip.title);
        if (!m) {
            throw new PipelineError(`${clip.title}: missing metadata`);
        }
        const originalPath = join(runDir, `${clip.id}--${basename(m.url)}`);
        await downloadOriginal(m.url, originalPath, options.fetchImpl ?? fetch);
        await sleep(500);
        const originalSha = sha256File(originalPath);
        // Commons publishes only a SHA-1 per file; this compares a download
        // against that published digest (integrity, not security). Our own
        // pinning hash is the SHA-256 recorded as original_sha256.
        // eslint-disable-next-line sonarjs/hashing -- Commons' published digest is SHA-1
        const commonsSha1 = createHash("sha1")
            .update(readFileSync(originalPath))
            .digest("hex");
        if (commonsSha1 !== m.sha1) {
            throw new PipelineError(
                `${clip.title}: sha1 mismatch against Commons — failing closed`,
            );
        }

        const durationS = ffprobeDurationSeconds(ffprobe, originalPath);
        const posterAt = Math.min(0.5, durationS / 2);
        const mp4 = join(outRoot, `content/media/${clip.id}.mp4`);
        const webm = join(outRoot, `content/media/${clip.id}.webm`);
        const webp = join(outRoot, `content/media/${clip.id}.webp`);
        const vtt = join(outRoot, `content/media/${clip.id}.vtt`);

        run(ffmpeg, [
            "-nostdin",
            "-y",
            "-loglevel",
            "error",
            "-i",
            originalPath,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-profile:v",
            "high",
            "-crf",
            "23",
            "-an",
            "-movflags",
            "+faststart",
            mp4,
        ]);
        run(ffmpeg, [
            "-nostdin",
            "-y",
            "-loglevel",
            "error",
            "-i",
            originalPath,
            "-c:v",
            "libvpx-vp9",
            "-b:v",
            "0",
            "-crf",
            "33",
            "-an",
            webm,
        ]);
        run(ffmpeg, [
            "-nostdin",
            "-y",
            "-loglevel",
            "error",
            "-ss",
            String(posterAt),
            "-i",
            originalPath,
            "-frames:v",
            "1",
            "-c:v",
            "libwebp",
            webp,
        ]);

        const captionText = captionTextFor(clip, m.description);
        writeFileSync(vtt, vttFor(captionText, durationS));

        const durationRounded = Math.round(durationS * 1000) / 1000;
        const record = {
            id: clip.id,
            kind: clip.kind,
            text_sv: clip.text_sv,
            sts_variant: clip.text_sv.toUpperCase(),
            video: {
                file: `content/media/${clip.id}.mp4`,
                mime: "video/mp4",
                duration_s: durationRounded,
                sha256: sha256File(mp4),
            },
            video_alt: {
                file: `content/media/${clip.id}.webm`,
                mime: "video/webm",
                duration_s: durationRounded,
                sha256: sha256File(webm),
            },
            poster: {
                file: `content/media/${clip.id}.webp`,
                sha256: sha256File(webp),
            },
            original_sha256: originalSha,
            transformations: [
                "transcode:h264",
                "transcode:vp9",
                "poster:frame@0.5s",
            ],
            provenance: {
                source_title: m.title,
                source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(m.title)}`,
                source_file_url: m.url,
                author: m.author,
                signer: null,
                publisher: publisherFor(m),
                licence: m.licence,
                licence_url: m.licenceUrl,
                retrieved_at: retrievedAt,
                permission_ticket:
                    m.author === "Spread the Sign" ? STS_VRT_TICKET : null,
            },
            rights: {
                code: "MIT",
                data: "CC-BY-4.0",
                media: m.licence,
                output: "CC-BY-4.0",
            },
            review: { status: "source-published" },
            caption: { kind: "vtt", lang: "sv", text: captionText },
        };
        utteranceRecord.parse(record);
        writeFileSync(
            join(outRoot, `content/utterances/${clip.id}.json`),
            `${JSON.stringify(record, null, 4)}\n`,
        );

        const spdx = spdxByLicence[m.licence] ?? "";
        if (!spdx) {
            throw new PipelineError(
                `${clip.title}: no SPDX id for licence ${m.licence}`,
            );
        }
        reuseMedia.push(
            `[[annotations]]\npath = ["${clip.id}.mp4", "${clip.id}.webm", "${clip.id}.webp"]\nSPDX-FileCopyrightText = "${m.author}"\nSPDX-License-Identifier = "${spdx}"\n`,
        );
        reuseMedia.push(
            `[[annotations]]\npath = "${clip.id}.vtt"\nSPDX-FileCopyrightText = "2026 Ludvig Aldén"\nSPDX-License-Identifier = "CC-BY-4.0"\n`,
        );
    }

    writeLinkOuts(outRoot, retrievedAt);

    writeFileSync(
        join(outRoot, "content/media/REUSE.toml"),
        `version = 1\n\n# Generated by tools/media-pipeline. Clips and posters keep their\n# source licence; caption files are ours.\n\n${reuseMedia.join("\n")}`,
    );
    writeFileSync(
        join(outRoot, "content/utterances/REUSE.toml"),
        `version = 1\n\n[[annotations]]\npath = "**"\nSPDX-FileCopyrightText = "2026 Ludvig Aldén"\nSPDX-License-Identifier = "CC-BY-4.0"\n`,
    );
    return 0;
}
