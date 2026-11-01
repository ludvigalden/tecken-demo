<script setup lang="ts">
import { computed, ref } from "vue";
import { FButton } from "@fkui/vue";
import TLiveStatus from "./TLiveStatus.vue";
import TSignResult from "./TSignResult.vue";
import TSignVideo from "./TSignVideo.vue";
import type { SignVideoSources } from "./TSignVideo.vue";

/**
 * A11y contract:
 * - Labelled "Fingerstavning – bokstav för bokstav, inte ett tecken för
 *   ordet" so nobody mistakes the spelling for a sign for the whole word.
 * - The first letter's clip is shown at once. With `autoplay`, the letters
 *   play in sequence, each clip muted and once, and the next letter starts
 *   when one ends; under prefers-reduced-motion nothing starts by itself.
 *   The native video controls pause any clip (WCAG 2.2.2), and pausing
 *   stops the sequence.
 * - "Föregående" and "Nästa bokstav" step by hand (FKUI buttons, keyboard
 *   operable); every step is announced through a polite live status line.
 * - The current letter is also shown as text, never colour alone.
 * - Same layout and video size as every other result (TSignResult).
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
    /** Play the letters in sequence on their own (muted). */
    autoplay?: boolean;
}>();

const emit = defineEmits<{
    finished: [word: string];
    played: [letter: string];
}>();

const index = ref(0);
/** Whether the next letter starts on its own when one ends. */
const sequencing = ref(props.autoplay ?? false);

const current = computed(() => props.letters[index.value]);
const announcement = computed(() => {
    const letter = current.value;
    return letter ? `Bokstav ${index.value + 1} av ${props.letters.length}: ${letter.letter.toUpperCase()}` : "";
});
const isFirst = computed(() => index.value <= 0);
const isLast = computed(() => index.value >= props.letters.length - 1);

function go(to: number): void {
    index.value = Math.min(Math.max(to, 0), props.letters.length - 1);
}

function onPlayed(): void {
    const letter = current.value;
    if (letter) {
        emit("played", letter.letter);
    }
}

function onEnded(): void {
    if (isLast.value) {
        emit("finished", props.word);
        return;
    }
    if (sequencing.value) {
        go(index.value + 1);
    }
}

function onPaused(): void {
    // A pause that is not the natural end of the clip is the user stopping
    // the sequence; the controls still step by hand.
    sequencing.value = false;
}

function previous(): void {
    sequencing.value = false;
    go(index.value - 1);
}

function next(): void {
    sequencing.value = false;
    go(index.value + 1);
}
</script>

<template>
    <t-sign-result v-if="current" class="t-fingerspelling" label="Fingerstavning">
        <template #media>
            <t-sign-video
                :key="current.id"
                :id="current.id"
                :label="`Bokstaven ${current.letter.toUpperCase()}`"
                :caption-text="current.captionText"
                :sources="current.sources"
                :autoplay="props.autoplay"
                @played="onPlayed"
                @paused="onPaused"
                @ended="onEnded"
            />
        </template>
        <p>
            Fingerstavning – bokstav för bokstav, inte ett tecken för ordet:
            <strong>{{ props.word }}</strong>
        </p>
        <p aria-hidden="true" class="t-fingerspelling__current">
            {{ current.letter.toUpperCase() }}
        </p>
        <t-live-status :message="announcement" />
        <div class="t-fingerspelling__steps">
            <f-button variant="secondary" size="medium" type="button" :disabled="isFirst" @click="previous">
                Föregående bokstav
            </f-button>
            <f-button variant="secondary" size="medium" type="button" :disabled="isLast" @click="next">
                Nästa bokstav
            </f-button>
        </div>
        <template #details>
            <slot name="details" />
        </template>
    </t-sign-result>
    <section v-else class="t-fingerspelling" aria-label="Fingerstavning">
        <p>
            Fingerstavning – bokstav för bokstav, inte ett tecken för ordet:
            <strong>{{ props.word }}</strong>
        </p>
    </section>
</template>
