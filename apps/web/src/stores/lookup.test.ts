import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { MatchResult, Utterance } from "../api/client";
import { useLookupStore } from "./lookup";

const matchPhrase = vi.hoisted(() => vi.fn());
vi.mock("../api/client", async (importOriginal) => {
    const real = await importOriginal<typeof import("../api/client")>();
    return { ...real, matchPhrase };
});

/** A corpus record from content/utterances in its wire form. */
function wire(id: string): Utterance {
    const record = JSON.parse(
        readFileSync(
            join(
                import.meta.dirname,
                `../../../../content/utterances/${id}.json`,
            ),
            "utf8",
        ),
    ) as Pick<Utterance, "id" | "kind" | "text_sv" | "provenance"> & {
        review: { status: Utterance["review_status"] };
    };
    return {
        id: record.id,
        kind: record.kind,
        text_sv: record.text_sv,
        playable: true,
        provenance: record.provenance,
        review_status: record.review.status,
    };
}

const hej = wire("hej");

function answer(result: MatchResult): void {
    matchPhrase.mockResolvedValueOnce(result);
}

describe("useLookupStore", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        matchPhrase.mockReset();
    });

    it("idle → loading → result on an exact match", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        expect(store.state).toBe("idle");
        let observed = "";
        matchPhrase.mockImplementationOnce(async () => {
            observed = store.state;
            return { result: "exact", utterance: hej };
        });
        await store.lookup("hej", vi.fn());
        expect(observed).toBe("loading");
        expect(store.state).toBe("result");
        expect(store.result?.id).toBe("hej");
    });

    it("suggested → confirming → result when the user confirms", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        answer({ result: "suggested", suggestions: [hej] });
        const states: string[] = [];
        const confirm = vi.fn(async () => {
            states.push(store.state);
            return true;
        });
        await store.lookup("heej", confirm);
        expect(confirm).toHaveBeenCalledWith(hej);
        expect(states).toEqual(["confirming"]);
        expect(store.state).toBe("result");
        expect(store.result?.id).toBe("hej");
    });

    it("returns to idle when the user declines the suggestion", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        answer({ result: "suggested", suggestions: [hej] });
        await store.lookup(
            "heej",
            vi.fn(async () => false),
        );
        expect(store.state).toBe("idle");
        expect(store.result).toBeNull();
        expect(store.suggestion).toBeNull();
    });

    it("unsupported keeps the reason, supported list and link-outs", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        answer({
            result: "unsupported",
            reason: "negation",
            supported: ["hej"],
            link_outs: [],
        });
        await store.lookup("inte hej", vi.fn());
        expect(store.state).toBe("unsupported");
        expect(store.unsupported?.reason).toBe("negation");
    });

    it("fingerspelling keeps the word and letters", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        answer({ result: "fingerspelling", word: "Åsa", letters: [hej] });
        await store.lookup("Åsa", vi.fn());
        expect(store.state).toBe("fingerspelling");
        expect(store.word).toBe("Åsa");
    });

    it("a network failure lands in the error state", async () => {
        expect.hasAssertions();
        const store = useLookupStore();
        matchPhrase.mockRejectedValueOnce(new TypeError("fetch failed"));
        await store.lookup("hej", vi.fn());
        expect(store.state).toBe("error");
    });
});
