<script setup lang="ts">
import type { UtteranceRecord } from "@ludvigalden-demo/tecken-contracts";

/**
 * A11y contract:
 * - Never autoplays; playback starts only from the user's explicit action.
 * - Native controls are keyboard operable; the element itself is focusable.
 * - Swedish captions are on by default (`<track … default>`).
 * - `preload="none"` plus a poster keeps the initial payload light.
 * - A human-visible label names the utterance; no meaning is carried by
 *   colour alone.
 */

const props = defineProps<{
    /** The utterance to play. Must be a media record, not a link-out. */
    record: UtteranceRecord;
    /** Heading shown above the video. */
    label: string;
}>();

const emit = defineEmits<{
    played: [id: string];
    ended: [id: string];
}>();

function mp4(): string {
    if (!props.record.video) {
        throw new Error("TSignVideo requires a media record");
    }
    return `/${props.record.video.file.replace(/^content\//, "")}`;
}

function webm(): string {
    if (!props.record.video_alt) {
        throw new Error("TSignVideo requires the webm sibling");
    }
    return `/${props.record.video_alt.file.replace(/^content\//, "")}`;
}

function vtt(): string {
    if (!props.record.video) {
        throw new Error("TSignVideo requires a media record");
    }
    return `/${props.record.video.file.replace(/\.mp4$/, ".vtt").replace(/^content\//, "")}`;
}
</script>

<template>
    <figure class="t-sign-video">
        <figcaption>{{ label }}</figcaption>
        <video
            controls
            preload="none"
            :poster="`/${record.poster?.file.replace(/^content\//, '') ?? ''}`"
            :aria-label="`${label} — inspelat tecken, ${record.caption?.text ?? ''}`"
            @play="emit('played', record.id)"
            @ended="emit('ended', record.id)"
        >
            <source :src="mp4()" type="video/mp4" />
            <source :src="webm()" type="video/webm" />
            <track kind="captions" srclang="sv" label="Svenska" :src="vtt()" default />
        </video>
    </figure>
</template>
