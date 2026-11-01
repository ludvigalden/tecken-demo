import type { LocationQuery } from "vue-router";

/** The phrase a lookup URL names (`/?q=`), as the lookup view reads it. */
export function phraseFromQuery(query: LocationQuery): string {
    const q = query.q;
    return typeof q === "string" ? q.trim() : "";
}

/** The word a fingerspelling URL names (`?ord=`), spaces removed. */
export function wordFromQuery(query: LocationQuery): string {
    const q = query.ord;
    return typeof q === "string" ? q.trim().replaceAll(/\s+/g, "") : "";
}
