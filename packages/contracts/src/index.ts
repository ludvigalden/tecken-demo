import { z } from "zod";

/** BCP-47-ish language ids used by the demo: `sv` for text, `swl` for STS. */
export const LANGUAGE_TEXT = "sv";
export const LANGUAGE_SIGN = "swl";

export const textLanguageId = z.literal(LANGUAGE_TEXT);
export const signLanguageId = z.literal(LANGUAGE_SIGN);

/** Licences accepted for redistributed media (Commons only). */
export const allowedMediaLicences = [
    "CC BY 3.0",
    "CC BY 4.0",
    "CC BY-SA 3.0",
    "CC BY-SA 4.0",
] as const;

export const mediaLicence = z.enum(allowedMediaLicences);

/**
 * Link-out licences: NC terms are legal to name but never to redistribute.
 * `utteranceRecord` enforces that NC licences appear on link-outs only.
 */
export const LINK_OUT_ONLY_LICENCE = "CC BY-NC-SA 4.0" as const;
export const provenanceLicence = z.enum([
    ...allowedMediaLicences,
    LINK_OUT_ONLY_LICENCE,
]);

/** Review states. No Commons clip is ever `reviewed`. */
export const reviewStatus = z.enum([
    "source-published",
    "reviewed",
    "not-validated",
]);

export const reviewRecord = z
    .object({
        status: reviewStatus,
        reviewed_by: z.string().min(1).optional(),
        reviewed_at: z.string().date().optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (value.status === "reviewed" && !value.reviewed_by) {
            ctx.addIssue({
                code: "custom",
                message: "review.status 'reviewed' requires reviewed_by",
            });
        }
    });

export const provenanceRecord = z
    .object({
        source_title: z.string().min(1),
        source_url: z.url(),
        source_file_url: z.url(),
        author: z.string().min(1),
        signer: z.string().min(1).nullable(),
        publisher: z.string().min(1),
        licence: provenanceLicence,
        licence_url: z.url(),
        retrieved_at: z.string().date(),
        permission_ticket: z.string().min(1).nullable(),
    })
    .strict();

/** Separate code / data / media / output rights for one record. */
export const rightsRecord = z
    .object({
        code: z.literal("MIT"),
        data: z.enum(["CC-BY-4.0"]),
        media: mediaLicence,
        output: z.enum(["CC-BY-4.0", "CC BY-NC-SA 4.0"]),
    })
    .strict();

export const captionRecord = z
    .object({
        kind: z.literal("vtt"),
        lang: textLanguageId,
        text: z.string().min(1),
    })
    .strict();

export const utteranceKind = z.enum([
    "utterance",
    "single-sign",
    "fingerspelling-letter",
    "link-out",
]);

export const videoRef = z
    .object({
        file: z.string().regex(/^content\/media\/[a-z0-9-]+\.(mp4|webm)$/),
        mime: z.enum(["video/mp4", "video/webm"]),
        duration_s: z.number().positive(),
        sha256: z.string().length(64),
    })
    .strict();

export const posterRef = z
    .object({
        file: z.string().regex(/^content\/media\/[a-z0-9-]+\.webp$/),
        sha256: z.string().length(64),
    })
    .strict();

/**
 * One content record. `link-out` records carry no media: `video`,
 * `original_sha256`, `transformations` and `caption` are absent.
 */
export const utteranceRecord = z
    .object({
        id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
        kind: utteranceKind,
        text_sv: z.string().min(1),
        sts_variant: z.string().min(1),
        video: videoRef.optional(),
        /** The VP9 WebM sibling of `video` (same clip, second transcode). */
        video_alt: videoRef.optional(),
        /** The poster frame. */
        poster: posterRef.optional(),
        original_sha256: z.string().length(64).optional(),
        transformations: z.array(z.string().min(1)).optional(),
        provenance: provenanceRecord,
        rights: rightsRecord.optional(),
        review: reviewRecord,
        caption: captionRecord.optional(),
        link_out_url: z.url().optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (value.kind === "link-out") {
            if (value.video || value.original_sha256 || value.transformations) {
                ctx.addIssue({
                    code: "custom",
                    message: "link-out records carry no media fields",
                });
            }
            if (!value.link_out_url) {
                ctx.addIssue({
                    code: "custom",
                    message: "link-out records require link_out_url",
                });
            }
        } else {
            if (
                !value.video ||
                !value.original_sha256 ||
                !value.transformations ||
                !value.caption
            ) {
                ctx.addIssue({
                    code: "custom",
                    message:
                        "media records require video, original_sha256, transformations and caption",
                });
            }
            if (value.provenance.licence === LINK_OUT_ONLY_LICENCE) {
                ctx.addIssue({
                    code: "custom",
                    message:
                        "NC licences are never redistributed; they may only name a link-out",
                });
            }
        }
    });

export type ReviewRecord = z.infer<typeof reviewRecord>;
export type ProvenanceRecord = z.infer<typeof provenanceRecord>;
export type RightsRecord = z.infer<typeof rightsRecord>;
export type CaptionRecord = z.infer<typeof captionRecord>;
export type VideoRef = z.infer<typeof videoRef>;
export type PosterRef = z.infer<typeof posterRef>;
export type UtteranceRecord = z.infer<typeof utteranceRecord>;
export type UtteranceKind = z.infer<typeof utteranceKind>;

/** POST /v1/match result. */
export const matchResult = z.discriminatedUnion("result", [
    z.object({ result: z.literal("exact"), utterance: utteranceRecord }),
    z
        .object({
            result: z.literal("suggested"),
            suggestions: z.array(utteranceRecord).min(1).max(5),
        })
        .strict(),
    z
        .object({
            result: z.literal("fingerspelling"),
            letters: z.array(utteranceRecord).min(1),
        })
        .strict(),
    z
        .object({
            result: z.literal("unsupported"),
            reason: z.string().min(1),
        })
        .strict(),
]);

export type MatchResult = z.infer<typeof matchResult>;

export const utteranceRecordJsonSchema = z.toJSONSchema(utteranceRecord, {
    io: "output",
    unrepresentable: "any",
});

export const workspace = "@ludvigalden-demo/tecken-contracts";
