<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FConfirmModal } from "@fkui/vue";
import type { FModalButtonDescriptor } from "@fkui/vue";
import TProvenanceBadge from "@ludvigalden-demo/tecken-design-system/components/TProvenanceBadge.vue";
import type { Utterance } from "../api/client";

/**
 * Mode B confirm. The root element is the FKUI modal, opened through the
 * `@fkui/vue` openModal API (never placed in another component's template).
 * It resolves with reason "confirm" or "dismiss"/"close". FKUI traps focus
 * while open and restores it to the triggering control on close.
 */

const props = defineProps<{
    /** The suggested supported utterance. */
    suggestion: Utterance;
}>();

const emit = defineEmits<{
    close: [result: { reason: string }];
}>();

const { t } = useI18n();

const buttons = computed<FModalButtonDescriptor[]>(() => [
    { label: t("suggest.confirm"), event: "confirm", reason: "confirm", type: "primary" },
    { label: t("suggest.dismiss"), event: "dismiss", reason: "dismiss", type: "secondary" },
]);

function onClose(result: { reason: string }): void {
    emit("close", result);
}
</script>

<template>
    <f-confirm-modal
        is-open
        :heading="t('suggest.heading', { text: props.suggestion.text_sv })"
        :ariaCloseText="t('suggest.close')"
        :buttons
        @close="onClose"
    >
        <template #heading>{{ t("suggest.heading", { text: props.suggestion.text_sv }) }}</template>
        <template #content>
            <p>{{ t("suggest.body") }}</p>
            <t-provenance-badge status="recorded" :source-label="t('provenance.recorded')" />
        </template>
    </f-confirm-modal>
</template>
