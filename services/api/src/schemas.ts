import { z } from "@hono/zod-openapi";
import {
    LINK_OUT_ONLY_LICENCE,
    allowedMediaLicences,
} from "@ludvigalden-demo/tecken-contracts";

/**
 * Wire schemas for the HTTP boundary, registered as OpenAPI components. They
 * describe what the API sends and accepts; the content records themselves
 * are validated against the contracts package at startup.
 */

export const MAX_TEXT_LENGTH = 200;

export const ProblemSchema = z
    .object({
        type: z.string().openapi({ example: "about:blank" }),
        title: z.string(),
        status: z.number().int(),
        code: z.enum([
            "invalid_request",
            "not_found",
            "rate_limited",
            "internal_error",
        ]),
        detail: z.string().optional(),
    })
    .strict()
    .openapi("Problem");

const VideoSchema = z
    .object({
        url: z.string(),
        mime: z.enum(["video/mp4", "video/webm"]),
        duration_s: z.number(),
        sha256: z.string(),
    })
    .strict()
    .openapi("Video");

export const ProvenanceSchema = z
    .object({
        source_title: z.string(),
        source_url: z.string(),
        source_file_url: z.string(),
        author: z.string(),
        signer: z.string().nullable(),
        publisher: z.string(),
        licence: z.enum([...allowedMediaLicences, LINK_OUT_ONLY_LICENCE]),
        licence_url: z.string(),
        retrieved_at: z.string(),
        permission_ticket: z.string().nullable(),
    })
    .strict()
    .openapi("Provenance");

export const UtteranceSchema = z
    .object({
        id: z.string(),
        kind: z.enum([
            "utterance",
            "single-sign",
            "fingerspelling-letter",
            "link-out",
        ]),
        text_sv: z.string(),
        playable: z.boolean(),
        video: VideoSchema.optional(),
        video_alt: VideoSchema.optional(),
        poster_url: z.string().optional(),
        captions_url: z.string().optional(),
        caption_text: z.string().optional(),
        link_out_url: z.string().optional(),
        provenance: ProvenanceSchema,
        review_status: z.enum([
            "source-published",
            "reviewed",
            "not-validated",
        ]),
    })
    .strict()
    .openapi("Utterance");

export const UtteranceListSchema = z
    .object({ items: z.array(UtteranceSchema) })
    .strict()
    .openapi("UtteranceList");

export const MatchRequestSchema = z
    .object({
        text: z.string().min(1).max(MAX_TEXT_LENGTH),
        mode: z.enum(["exact", "suggest", "fingerspell"]),
    })
    .strict()
    .openapi("MatchRequest");

export const MatchResultSchema = z
    .discriminatedUnion("result", [
        z
            .object({ result: z.literal("exact"), utterance: UtteranceSchema })
            .strict(),
        z
            .object({
                result: z.literal("suggested"),
                suggestions: z.array(UtteranceSchema).min(1).max(3),
            })
            .strict(),
        z
            .object({
                result: z.literal("fingerspelling"),
                word: z.string(),
                letters: z.array(UtteranceSchema).min(1),
            })
            .strict(),
        z
            .object({
                result: z.literal("unsupported"),
                reason: z.enum(["no_match", "negation", "empty"]),
                supported: z.array(z.string()),
                link_outs: z.array(UtteranceSchema),
            })
            .strict(),
    ])
    .openapi("MatchResult");

export const HealthSchema = z
    .object({ status: z.literal("ok") })
    .strict()
    .openapi("Health");

export type Utterance = z.infer<typeof UtteranceSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
