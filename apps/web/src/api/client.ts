import createClient from "openapi-fetch";
import type { components, paths } from "../generated/schema";

export type Utterance = components["schemas"]["Utterance"];
export type MatchResult = components["schemas"]["MatchResult"];
export type MatchMode = components["schemas"]["MatchRequest"]["mode"];

/** Same-origin typed client generated from contracts/openapi. */
export const api = createClient<paths>({ baseUrl: "/" });

export class ApiError extends Error {}

async function requestMatch(
    text: string,
    mode: MatchMode,
): Promise<MatchResult> {
    const { data, error } = await api.POST("/v1/match", {
        body: { text, mode },
    });
    if (error || !data) {
        throw new ApiError(error?.title ?? "match failed");
    }
    return data;
}

/**
 * Matches started by the router before a route renders (see router.ts),
 * keyed by mode and text. Each is consumed once by the view's own
 * `matchPhrase` call, which then settles at once, so the view's first
 * paint already shows the outcome.
 */
const primed = new Map<string, Promise<MatchResult>>();

function primeKey(text: string, mode: MatchMode): string {
    return `${mode}\0${text}`;
}

/** Starts a match ahead of the view; resolves (never rejects) when settled. */
export function primeMatch(text: string, mode: MatchMode): Promise<void> {
    const key = primeKey(text, mode);
    let pending = primed.get(key);
    if (!pending) {
        pending = requestMatch(text, mode);
        primed.set(key, pending);
    }
    return pending.then(() => undefined).catch(() => undefined);
}

export function matchPhrase(
    text: string,
    mode: MatchMode,
): Promise<MatchResult> {
    const key = primeKey(text, mode);
    const pending = primed.get(key);
    primed.delete(key);
    return pending ?? requestMatch(text, mode);
}

export async function listUtterances(): Promise<Utterance[]> {
    const { data, error } = await api.GET("/v1/utterances");
    if (error || !data) {
        throw new ApiError(error?.title ?? "list failed");
    }
    return data.items;
}
