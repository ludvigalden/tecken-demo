import { readFileSync } from "node:fs";
import { join } from "node:path";
import { utteranceRecord } from "@ludvigalden-demo/tecken-contracts";
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";

const utterances = join(
    import.meta.dirname,
    "../../../../../content/utterances",
);

/** A record from content/utterances, validated against the contract. */
export function corpusRecord(id: string): UtteranceRecord {
    return utteranceRecord.parse(
        JSON.parse(readFileSync(join(utterances, `${id}.json`), "utf8")),
    );
}

/** The utterance "hej". */
export const validMediaRecord = corpusRecord("hej");
