<script setup lang="ts">
import { computed } from "vue";
import TFingerspellingPlayer from "@ludvigalden-demo/tecken-design-system/components/TFingerspellingPlayer.vue";
import type { FingerspellingLetter } from "@ludvigalden-demo/tecken-design-system/components/TFingerspellingPlayer.vue";
import TProvenancePanel from "@ludvigalden-demo/tecken-design-system/components/TProvenancePanel.vue";
import type { Utterance } from "../api/client";

/**
 * Fingerspelling in the shared result layout: it starts at once, letter by
 * letter. The source panel follows the current letter.
 */
const props = defineProps<{ word: string; letters: Utterance[] }>();

const playerLetters = computed<FingerspellingLetter[]>(() =>
    props.letters
        .filter((l) => l.video && l.video_alt && l.captions_url)
        .map((l) => ({
            id: l.id,
            letter: l.text_sv,
            ...(l.caption_text && { captionText: l.caption_text }),
            sources: {
                mp4: l.video?.url ?? "",
                webm: l.video_alt?.url ?? "",
                captions: l.captions_url ?? "",
                ...(l.poster_url && { poster: l.poster_url }),
            },
        })),
);

/** Every letter clip comes from the same manual-alphabet source. */
const provenance = computed(() => props.letters[0]?.provenance);
</script>

<template>
    <t-fingerspelling-player :word="props.word" :letters="playerLetters" autoplay>
        <template #details>
            <t-provenance-panel v-if="provenance" :provenance />
        </template>
    </t-fingerspelling-player>
</template>
