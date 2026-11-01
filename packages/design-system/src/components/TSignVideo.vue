<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";

/**
 * A11y contract:
 * - Never autoplays; playback starts only from the user's explicit action.
 * - Native controls are keyboard operable; the element itself is focusable
 *   and draws the Tecken focus ring.
 * - Swedish captions are on by default (`<track … default>`, and the track
 *   mode is set to "showing" on mount so every engine honours it).
 * - `preload="none"` plus a poster keeps the initial payload light.
 * - A human-visible label names the utterance; no meaning is carried by
 *   colour alone.
 *
 * The component takes only what it renders (URLs and text), so any source
 * of clips — content records, the API's wire shape — can drive it without
 * inventing fields.
 */

export interface SignVideoSources {
    /** H.264 MP4 URL. */
    mp4: string;
    /** VP9 WebM URL. */
    webm: string;
    /** WebVTT captions URL (Swedish). */
    captions: string;
    /** Poster image URL. */
    poster?: string | undefined;
}

const props = defineProps<{
    /** Stable id, echoed in events. */
    id: string;
    /** Heading shown above the video. */
    label: string;
    /** Caption text, used in the accessible name. */
    captionText?: string | undefined;
    sources: SignVideoSources;
}>();

const emit = defineEmits<{
    played: [id: string];
    ended: [id: string];
}>();

const videoEl = useTemplateRef<HTMLVideoElement>("video");

/**
 * Captions are on by default. `<track default>` alone is not enough: WebKit
 * follows the user's system caption preference and leaves the track
 * disabled (it never even loads the cues). Setting the mode explicitly
 * makes "captions on" hold in every engine; the user can still switch them
 * off from the native controls.
 */
function showCaptions(): void {
    const track = videoEl.value?.textTracks[0];
    if (track && track.mode === "disabled") {
        track.mode = "showing";
    }
}

onMounted(showCaptions);
</script>

<template>
    <figure class="t-sign-video">
        <figcaption>{{ props.label }}</figcaption>
        <video
            ref="video"
            controls
            preload="none"
            :poster="props.sources.poster"
            :aria-label="`${props.label} — inspelat tecken${props.captionText ? `, ${props.captionText}` : ''}`"
            @play="emit('played', props.id)"
            @ended="emit('ended', props.id)"
        >
            <source :src="props.sources.mp4" type="video/mp4" />
            <source :src="props.sources.webm" type="video/webm" />
            <track kind="captions" srclang="sv" label="Svenska" :src="props.sources.captions" default />
        </video>
    </figure>
</template>
