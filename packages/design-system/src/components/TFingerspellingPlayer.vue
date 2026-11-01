<script setup lang="ts">
import { computed, ref } from "vue";
import { FButton } from "@fkui/vue";
import TLiveStatus from "./TLiveStatus.vue";
import TSignVideo from "./TSignVideo.vue";
import type { SignVideoSources } from "./TSignVideo.vue";

/**
 * A11y contract:
 * - Labelled "Fingerstavning – bokstav för bokstav, inte ett tecken för
 *   ordet" so nobody mistakes the spelling for a sign for the whole word.
 * - Steps through the letters one at a time; each step shows that letter's
 *   recorded clip (with captions) and announces the letter through a polite
 *   live status line.
 * - Every step is user-initiated (an FKUI FButton, keyboard operable with
 *   the Tecken focus ring); nothing autoplays.
 * - The current letter is also shown as text, never colour alone.
 */

export interface FingerspellingLetter {
    id: string;
    /** The letter, lower case, e.g. "å". */
    letter: string;
    captionText?: string | undefined;
    sources: SignVideoSources;
}

const props = defineProps<{
    /** The word being spelled, for display. */
    word: string;
    /** One clip per letter, in spelling order. */
    letters: FingerspellingLetter[];
}>();

const emit = defineEmits<{
    finished: [word: string];
    played: [letter: string];
}>();

/** -1 before the first step; letters.length after the last. */
const index = ref(-1);

const current = computed(() => props.letters[index.value]);
const finished = computed(() => props.letters.length > 0 && index.value >= props.letters.length);
const announcement = computed(() => {
    if (finished.value) {
        return `Klart: ${props.word}`;
    }
    const letter = current.value;
    return letter ? `Bokstav ${index.value + 1} av ${props.letters.length}: ${letter.letter.toUpperCase()}` : "";
});
const buttonLabel = computed(() => {
    if (index.value < 0 || finished.value) {
        return "Bokstav för bokstav";
    }
    return "Nästa bokstav";
});

function step(): void {
    if (finished.value) {
        index.value = -1;
    }
    index.value += 1;
    const letter = props.letters[index.value];
    if (letter) {
        emit("played", letter.letter);
    } else {
        emit("finished", props.word);
    }
}
</script>

<template>
    <section class="t-fingerspelling" aria-label="Fingerstavning">
        <p>
            Fingerstavning – bokstav för bokstav, inte ett tecken för ordet:
            <strong>{{ props.word }}</strong>
        </p>
        <p v-if="current" aria-hidden="true" class="t-fingerspelling__current">
            {{ current.letter.toUpperCase() }}
        </p>
        <t-sign-video
            v-if="current"
            :key="current.id"
            :id="current.id"
            :label="`Bokstaven ${current.letter.toUpperCase()}`"
            :caption-text="current.captionText"
            :sources="current.sources"
        />
        <t-live-status :message="announcement" />
        <f-button variant="secondary" size="medium" type="button" @click="step">
            {{ buttonLabel }}
        </f-button>
    </section>
</template>
