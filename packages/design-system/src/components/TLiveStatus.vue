<script setup lang="ts">
/**
 * A11y contract:
 * - `role="status"` with polite live semantics: state changes are announced
 *   without stealing focus.
 * - The region is plain text; it never traps focus or moves it.
 * - It always takes one line's height, empty or not, so a message
 *   appearing or changing never moves the content below it (no layout
 *   shift).
 */

defineProps<{
    /** Message to announce. Empty string renders an empty, present region. */
    message: string;
}>();
</script>

<template>
    <div class="t-live-status" role="status" aria-live="polite">{{ message }}</div>
</template>
