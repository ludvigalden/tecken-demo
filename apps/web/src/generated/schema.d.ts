/* Generated from contracts/openapi/tecken.openapi.json by openapi-typescript — do not edit. */
export interface paths {
    "/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/utterances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listUtterances"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/utterances/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getUtterance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/match": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["matchPhrase"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Health: {
            /** @enum {string} */
            status: "ok";
        };
        UtteranceList: {
            items: components["schemas"]["Utterance"][];
        };
        Utterance: {
            id: string;
            /** @enum {string} */
            kind: "utterance" | "single-sign" | "fingerspelling-letter" | "link-out";
            text_sv: string;
            playable: boolean;
            video?: components["schemas"]["Video"];
            video_alt?: components["schemas"]["Video"];
            poster_url?: string;
            captions_url?: string;
            caption_text?: string;
            link_out_url?: string;
            provenance: components["schemas"]["Provenance"];
            /** @enum {string} */
            review_status: "source-published" | "reviewed" | "not-validated";
        };
        Video: {
            url: string;
            /** @enum {string} */
            mime: "video/mp4" | "video/webm";
            duration_s: number;
            sha256: string;
        };
        Provenance: {
            source_title: string;
            source_url: string;
            source_file_url: string;
            author: string;
            signer: string | null;
            publisher: string;
            /** @enum {string} */
            licence: "CC BY 3.0" | "CC BY 4.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0" | "CC BY-NC-SA 4.0";
            licence_url: string;
            retrieved_at: string;
            permission_ticket: string | null;
        };
        Problem: {
            /** @example about:blank */
            type: string;
            title: string;
            status: number;
            /** @enum {string} */
            code: "invalid_request" | "not_found" | "rate_limited" | "internal_error";
            detail?: string;
        };
        MatchResult: {
            /** @enum {string} */
            result: "exact";
            utterance: components["schemas"]["Utterance"];
        } | {
            /** @enum {string} */
            result: "suggested";
            suggestions: components["schemas"]["Utterance"][];
        } | {
            /** @enum {string} */
            result: "fingerspelling";
            word: string;
            letters: components["schemas"]["Utterance"][];
        } | {
            /** @enum {string} */
            result: "unsupported";
            /** @enum {string} */
            reason: "no_match" | "negation" | "empty";
            supported: string[];
            link_outs: components["schemas"]["Utterance"][];
        };
        MatchRequest: {
            text: string;
            /** @enum {string} */
            mode: "exact" | "suggest";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The process is up. Performs no I/O. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    listUtterances: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Every content record, playable or not. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UtteranceList"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getUtterance: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One content record. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Utterance"];
                };
            };
            /** @description Invalid id */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description No such record */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    matchPhrase: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MatchRequest"];
            };
        };
        responses: {
            /** @description The match outcome. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MatchResult"];
                };
            };
            /** @description Invalid request body */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Rate limited */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
