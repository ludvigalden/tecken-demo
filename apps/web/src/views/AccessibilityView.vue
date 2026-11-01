<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * Tillgänglighetsredogörelse. The full text, with links to the coverage
 * map and the manual checklist, is docs/accessibility/tillganglighetsredogorelse.md.
 */
const { t, tm, rt } = useI18n();
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("accessibility.heading") }}</h1>
    <p>{{ t("accessibility.intro") }}</p>
    <h2>{{ t("accessibility.levelHeading") }}</h2>
    <p>{{ t("accessibility.level") }}</p>
    <p>
        <strong>{{ t("accessibility.status") }}</strong>
    </p>
    <h2>{{ t("accessibility.gapsHeading") }}</h2>
    <ul>
        <li v-for="(item, i) in tm('accessibility.gaps')" :key="i">{{ rt(item) }}</li>
    </ul>
    <h2>{{ t("accessibility.featuresHeading") }}</h2>
    <ul>
        <li>{{ t("accessibility.captions") }}</li>
        <li>{{ t("accessibility.keyboard") }}</li>
        <li>{{ t("accessibility.motion") }}</li>
    </ul>
    <h2>{{ t("accessibility.methodHeading") }}</h2>
    <p>{{ t("accessibility.method") }}</p>
    <h2>{{ t("accessibility.reportHeading") }}</h2>
    <p>{{ t("accessibility.report") }}</p>
    <h2>{{ t("accessibility.supervisionHeading") }}</h2>
    <p>{{ t("accessibility.supervision") }}</p>
    <p>{{ t("accessibility.updated") }}</p>
</template>
