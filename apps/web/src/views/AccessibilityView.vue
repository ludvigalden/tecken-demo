<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("accessibility.heading") }}</h1>
    <p>{{ t("accessibility.intro") }}</p>
    <ul>
        <li>{{ t("accessibility.captions") }}</li>
        <li>{{ t("accessibility.keyboard") }}</li>
        <li>{{ t("accessibility.motion") }}</li>
    </ul>
</template>
