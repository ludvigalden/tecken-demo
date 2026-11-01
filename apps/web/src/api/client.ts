import createClient from "openapi-fetch";
import type { components, paths } from "../generated/schema";

export type Utterance = components["schemas"]["Utterance"];
export type MatchResult = components["schemas"]["MatchResult"];
export type MatchMode = components["schemas"]["MatchRequest"]["mode"];

/** Same-origin typed client generated from contracts/openapi. */
export const api = createClient<paths>({ baseUrl: "/" });

export class ApiError extends Error {}

export async function matchPhrase(
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

export async function listUtterances(): Promise<Utterance[]> {
    const { data, error } = await api.GET("/v1/utterances");
    if (error || !data) {
        throw new ApiError(error?.title ?? "list failed");
    }
    return data.items;
}
