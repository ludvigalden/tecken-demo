<script setup lang="ts">
import { ref } from "vue";
import { FButton } from "@fkui/vue";
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";

/**
 * A11y contract:
 * - Plays letter clips in sequence, labelled "Fingerstavning – bokstav för
 *   bokstav, inte ett tecken för ordet" so nobody mistakes the spelling for
 *   a sign for the whole word.
 * - Each letter is announced through a live status line as it plays.
 * - Playback is user-initiated (an FKUI FButton, keyboard operable with the
 *   Tecken focus ring); no autoplay.
 * - The current letter is shown as text, never colour alone.
 */

const props = defineProps<{
    /** The word being spelled, for display. */
    word: string;
    /** One media record per letter, in spelling order. */
    letters: UtteranceRecord[];
}>();

const emit = defineEmits<{
    finished: [word: string];
    played: [letter: string];
}>();

const index = ref(0);
const currentLetter = ref("");

function letterOf(record: UtteranceRecord): string {
    return record.text_sv.toUpperCase();
}

async function playNext(): Promise<void> {
    if (index.value >= props.letters.length) {
        currentLetter.value = "";
        emit("finished", props.word);
        return;
    }
    const record = props.letters[index.value];
    if (!record) {
        return;
    }
    currentLetter.value = letterOf(record);
    emit("played", record.text_sv);
    index.value += 1;
}
</script>

<template>
    <section class="t-fingerspelling" aria-label="Fingerstavning">
        <p>
            Fingerstavning – bokstav för bokstav, inte ett tecken för ordet:
            <strong>{{ word }}</strong>
        </p>
        <p aria-hidden="true" class="t-fingerspelling__current">{{ currentLetter }}</p>
        <f-button variant="secondary" size="medium" type="button" @click="playNext">
            {{ index === 0 ? "Bokstav för bokstav" : "Nästa bokstav" }}
        </f-button>
    </section>
</template>
