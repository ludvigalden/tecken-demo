<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("about.heading") }}</h1>
    <p>{{ t("about.scope") }}</p>
    <h2>{{ t("about.limitsHeading") }}</h2>
    <ul>
        <li v-for="(item, i) in tm('about.limits')" :key="i">{{ rt(item) }}</li>
    </ul>
    <h2>{{ t("about.stanceHeading") }}</h2>
    <p>{{ t("about.stance") }}</p>
</template>
