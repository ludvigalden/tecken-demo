<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AccessibilityStatement from "../generated/AccessibilityStatement.vue";

/**
 * Tillgänglighetsredogörelse. The statement itself lives only in
 * docs/accessibility/tillganglighetsredogorelse.md; this view renders the
 * component generated from it at build time (src/generated/, drift-gated).
 */
const { t } = useI18n();
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("accessibility.heading") }}</h1>
    <accessibility-statement />
</template>
