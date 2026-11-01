<script setup lang="ts">
/**
 * One layout for every recorded result: the phrase lookup and the
 * fingerspelling page both render through it, so video size and position
 * are the same everywhere.
 *
 * Layout contract:
 * - Wide screens: two columns, the video beside its information. Narrow
 *   screens: one column, video first, wrapping without horizontal scroll.
 * - The video column is capped by the video's own 80 %-of-viewport height
 *   rule (see TSignVideo), so the clip and its controls always fit on
 *   screen without scrolling.
 * - Order inside the information column, most relevant first: the result's
 *   own content (default slot), then the provenance badge, then the
 *   details slot (the "Om källan" panel) at the bottom.
 */

defineProps<{
    /** Accessible name of the result region. */
    label: string;
}>();
</script>

<template>
    <section class="t-sign-result" :aria-label="label">
        <div class="t-sign-result__media">
            <slot name="media" />
        </div>
        <div class="t-sign-result__info">
            <slot />
            <slot name="details" />
        </div>
    </section>
</template>
