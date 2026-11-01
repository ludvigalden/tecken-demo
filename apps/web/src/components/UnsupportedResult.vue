<script setup lang="ts">
import { useI18n } from "vue-i18n";
import TProvenanceBadge from "@ludvigalden-demo/tecken-design-system/components/TProvenanceBadge.vue";
import type { UnsupportedResult } from "../stores/lookup";

/**
 * Unsupported input: say so plainly, list what is supported, and offer the
 * lexicon link-outs. Never a guess, never a translation.
 */
const props = defineProps<{ outcome: UnsupportedResult }>();
const { t } = useI18n();
</script>

<template>
    <t-provenance-badge status="unsupported" source-label="" />
    <p v-if="props.outcome.reason === 'negation'">{{ t("lookup.unsupportedNegation") }}</p>
    <p v-else-if="props.outcome.reason === 'empty'">{{ t("lookup.unsupportedEmpty") }}</p>
    <template v-else>
        <p>{{ t("lookup.unsupportedNoMatch") }}</p>
        <ul class="supported-list">
            <li v-for="text in props.outcome.supported" :key="text">
                <q>{{ text }}</q>
            </li>
        </ul>
    </template>
    <h3>{{ t("lookup.linkOutsHeading") }}</h3>
    <p>{{ t("lookup.linkOutsNote") }}</p>
    <ul>
        <li v-for="link in props.outcome.link_outs" :key="link.id">
            <a :href="link.link_out_url" rel="noopener noreferrer">{{ link.text_sv }}</a>
            <t-provenance-badge status="link-out" :source-label="t('provenance.linkOut')" />
        </li>
    </ul>
</template>
