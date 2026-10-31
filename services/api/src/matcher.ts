/**
 * The phrase matcher. Pure: no I/O, no state.
 *
 * Normalisation: NFC, locale-aware casefold, punctuation strip, whitespace
 * collapse. Exact mode is a normalised equality lookup. Suggest mode ranks by
 * token-set similarity (Jaccard), with a negation guard: a negated input never
 * matches or suggests a non-negated utterance, and vice versa, so "jag behöver
 * inte tvätta" can never be offered "jag behöver tvätta lite".
 */

export const NEGATIONS = new Set(["inte", "ej", "aldrig", "icke"]);

export interface Matchable {
    id: string;
    text_sv: string;
    kind: string;
}

export function normalize(text: string): string {
    return text
        .normalize("NFC")
        .toLocaleLowerCase("sv-SE")
        .replaceAll(/[\p{P}\p{S}]+/gu, " ")
        .replaceAll(/\s+/g, " ")
        .trim();
}

export function tokens(text: string): string[] {
    const n = normalize(text);
    return n === "" ? [] : n.split(" ");
}

export function isNegated(text: string): boolean {
    return tokens(text).some((t) => NEGATIONS.has(t));
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
    let shared = 0;
    for (const t of a) {
        if (b.has(t)) {
            shared += 1;
        }
    }
    const union = a.size + b.size - shared;
    return union === 0 ? 0 : shared / union;
}

/** Normalised exact lookup. Link-outs and letters are not phrase results. */
export function exactMatch<T extends Matchable>(
    input: string,
    candidates: readonly T[],
): T | undefined {
    const key = normalize(input);
    if (key === "") {
        return undefined;
    }
    return candidates.find((c) => isPhrase(c) && normalize(c.text_sv) === key);
}

function isPhrase(c: Matchable): boolean {
    return c.kind === "utterance" || c.kind === "single-sign";
}

export interface Suggestion<T> {
    candidate: T;
    score: number;
}

/**
 * Token-set similarity suggestions. Only candidates whose negation state
 * equals the input's are eligible (the negation guard). Returns at most
 * `limit` suggestions with score ≥ `threshold`, best first.
 */
export function suggest<T extends Matchable>(
    input: string,
    candidates: readonly T[],
    { threshold = 0.5, limit = 3 }: { threshold?: number; limit?: number } = {},
): Array<Suggestion<T>> {
    const inputTokens = new Set(tokens(input));
    if (inputTokens.size === 0) {
        return [];
    }
    const inputNegated = isNegated(input);
    return candidates
        .filter((c) => isPhrase(c) && isNegated(c.text_sv) === inputNegated)
        .map((c) => ({
            candidate: c,
            score: jaccard(inputTokens, new Set(tokens(c.text_sv))),
        }))
        .filter((s) => s.score >= threshold)
        .toSorted((a, b) => b.score - a.score)
        .slice(0, limit);
}

/** Letters available for fingerspelling, keyed by lower-case letter. */
export function fingerspell<T extends Matchable>(
    word: string,
    letters: readonly T[],
): T[] | undefined {
    const byLetter = new Map(
        letters
            .filter((l) => l.kind === "fingerspelling-letter")
            .map((l) => [normalize(l.text_sv), l]),
    );
    const chars = [...normalize(word).replaceAll(" ", "")];
    if (chars.length === 0) {
        return undefined;
    }
    const out: T[] = [];
    for (const ch of chars) {
        const letter = byLetter.get(ch);
        if (!letter) {
            return undefined;
        }
        out.push(letter);
    }
    return out;
}
