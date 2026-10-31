<script setup lang="ts">
import { computed } from "vue";
import { FBadge, FIcon } from "@fkui/vue";

/**
 * A11y contract:
 * - Never colour alone: every status carries an icon and a Swedish text.
 * - The badge is a static label (not interactive); it adds no focus stop.
 * - Screen readers hear "Källa: <text>", not a colour name.
 */

const props = defineProps<{
    /** Which provenance state the badge names. */
    status: "recorded" | "link-out" | "unsupported";
    /** Human-readable source name, e.g. "Wikimedia Commons". */
    sourceLabel: string;
}>();

const config = computed(() => {
    switch (props.status) {
        case "recorded":
            return { icon: "success", text: `Inspelad källa: ${props.sourceLabel}` };
        case "link-out":
            return { icon: "info", text: `Länk till källa: ${props.sourceLabel}` };
        default:
            return { icon: "warning", text: "Ingen inspelning — bara källhänvisning" };
    }
});
</script>

<template>
    <f-badge :status="status === 'recorded' ? 'success' : status === 'link-out' ? 'info' : 'warning'">
        <f-icon :name="config.icon" />
        {{ config.text }}
    </f-badge>
</template>
