<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

/**
 * A11y contract:
 * - With `autoplay`, the clip starts muted on its own once mounted, unless
 *   the user prefers reduced motion; then it waits for an explicit play.
 *   Sign video carries no meaningful audio, so muting loses nothing, and a
 *   muted start is what browsers' autoplay rules allow. The clip is short
 *   and never loops, and the native controls (pause, play, seek) are always
 *   there, so it can be paused (WCAG 2.2.2).
 * - Without `autoplay`, playback starts only from the user's action.
 * - Native controls are keyboard operable; the element itself is focusable
 *   and draws the Tecken focus ring.
 * - Swedish captions are on by default (`<track … default>`, and the track
 *   mode is set to "showing" on mount so every engine honours it).
 * - The video is capped at 80 % of the small viewport height, so the whole
 *   clip and its controls always fit on screen.
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
    /** Start muted on mount, unless the user prefers reduced motion. */
    autoplay?: boolean;
}>();

const emit = defineEmits<{
    played: [id: string];
    /** A pause by the user, not the natural end of the clip. */
    paused: [id: string];
    ended: [id: string];
}>();

const videoEl = useTemplateRef<HTMLVideoElement>("video");

function onPause(): void {
    // Reaching the end also fires "pause" (just before "ended"); only a
    // pause before the end is the user stopping the clip.
    if (!videoEl.value?.ended) {
        emit("paused", props.id);
    }
}

/*
 * WebKit can freeze on a clip's last frame without ever firing "ended":
 * currentTime stops a hair short of duration, paused stays false. So when
 * playback reaches the last moments, a timer checks back after the clip
 * should have finished and ends it if the element is still stuck there.
 * "ended" is reported once per play-through, whichever path gets there.
 */
const NEAR_END_S = 0.3;
const STUCK_S = 0.05;
let endReported = false;
let endTimer: ReturnType<typeof setTimeout> | undefined;

function clearEndTimer(): void {
    if (endTimer !== undefined) {
        clearTimeout(endTimer);
        endTimer = undefined;
    }
}

function reportEnd(): void {
    clearEndTimer();
    if (!endReported) {
        endReported = true;
        emit("ended", props.id);
    }
}

function onPlay(): void {
    endReported = false;
    emit("played", props.id);
}

function onTimeUpdate(): void {
    const video = videoEl.value;
    if (!video || endReported || endTimer !== undefined || !Number.isFinite(video.duration)) {
        return;
    }
    const remaining = video.duration - video.currentTime;
    if (remaining > NEAR_END_S) {
        return;
    }
    endTimer = setTimeout(
        () => {
            endTimer = undefined;
            const v = videoEl.value;
            if (v && !v.paused && !v.ended && v.duration - v.currentTime <= STUCK_S) {
                reportEnd();
            }
        },
        (remaining + 0.25) * 1000,
    );
}

onBeforeUnmount(clearEndTimer);

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

function prefersReducedMotion(): boolean {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Starts the clip muted. A browser may still refuse (its own autoplay
 * policy); the clip then simply waits for the user, with its controls.
 */
function startMuted(): void {
    const video = videoEl.value;
    if (!video || !props.autoplay || prefersReducedMotion()) {
        return;
    }
    video.muted = true;
    const started = video.play();
    if (started && typeof started.catch === "function") {
        started.catch(() => undefined);
    }
}

onMounted(() => {
    showCaptions();
    startMuted();
});

defineExpose({
    /** The underlying media element, for players that sequence clips. */
    media: videoEl,
});
</script>

<template>
    <figure class="t-sign-video">
        <figcaption>{{ props.label }}</figcaption>
        <video
            ref="video"
            controls
            playsinline
            :preload="props.autoplay ? 'auto' : 'none'"
            :poster="props.sources.poster"
            :aria-label="`${props.label} — inspelat tecken${props.captionText ? `, ${props.captionText}` : ''}`"
            @play="onPlay"
            @pause="onPause"
            @ended="reportEnd"
            @timeupdate="onTimeUpdate"
            @seeking="clearEndTimer"
        >
            <source :src="props.sources.mp4" type="video/mp4" />
            <source :src="props.sources.webm" type="video/webm" />
            <track kind="captions" srclang="sv" label="Svenska" :src="props.sources.captions" default />
        </video>
    </figure>
</template>
