import { defineStore } from "pinia";
import { ref } from "vue";
import { ApiError, matchPhrase } from "../api/client";
import type { MatchResult, Utterance } from "../api/client";

/**
 * Lookup state machine:
 *   idle → loading → result | suggested | unsupported | error | fingerspelling
 *   suggested → confirming → result (confirm) | idle (cancel)
 */
export type LookupState =
    | "idle"
    | "loading"
    | "result"
    | "suggested"
    | "confirming"
    | "unsupported"
    | "error"
    | "fingerspelling";

export type UnsupportedResult = Extract<MatchResult, { result: "unsupported" }>;

/** Opens the confirm dialog for one suggestion; resolves true on confirm. */
export type ConfirmSuggestion = (suggestion: Utterance) => Promise<boolean>;

export const useLookupStore = defineStore("lookup", () => {
    const state = ref<LookupState>("idle");
    const query = ref("");
    const result = ref<Utterance | null>(null);
    const suggestion = ref<Utterance | null>(null);
    const unsupported = ref<UnsupportedResult | null>(null);
    const letters = ref<Utterance[]>([]);
    const word = ref("");

    function reset(): void {
        state.value = "idle";
        result.value = null;
        suggestion.value = null;
        unsupported.value = null;
        letters.value = [];
        word.value = "";
    }

    async function lookup(
        text: string,
        confirm: ConfirmSuggestion,
    ): Promise<void> {
        reset();
        query.value = text;
        state.value = "loading";
        let outcome: MatchResult;
        try {
            outcome = await matchPhrase(text, "suggest");
        } catch (error) {
            state.value = "error";
            if (!(error instanceof ApiError) && !(error instanceof TypeError)) {
                throw error;
            }
            return;
        }
        switch (outcome.result) {
            case "exact":
                result.value = outcome.utterance;
                state.value = "result";
                return;
            case "fingerspelling":
                letters.value = outcome.letters;
                word.value = outcome.word;
                state.value = "fingerspelling";
                return;
            case "unsupported":
                unsupported.value = outcome;
                state.value = "unsupported";
                return;
            case "suggested": {
                const [first] = outcome.suggestions;
                if (!first) {
                    state.value = "error";
                    return;
                }
                suggestion.value = first;
                state.value = "suggested";
                state.value = "confirming";
                const accepted = await confirm(first);
                if (accepted) {
                    result.value = first;
                    suggestion.value = null;
                    state.value = "result";
                } else {
                    reset();
                }
                return;
            }
        }
    }

    return {
        state,
        query,
        result,
        suggestion,
        unsupported,
        letters,
        word,
        lookup,
        reset,
    };
});
