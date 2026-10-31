<script setup lang="ts">
/**
 * A11y contract:
 * - `role="status"` with polite live semantics: state changes are announced
 *   without stealing focus.
 * - The region is plain text; it never traps focus or moves it.
 */

defineProps<{
    /** Message to announce. Empty string renders an empty, present region. */
    message: string;
}>();
</script>

<template>
    <div role="status" aria-live="polite">{{ message }}</div>
</template>
