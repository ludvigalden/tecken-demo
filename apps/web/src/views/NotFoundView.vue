<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("notFound.heading") }}</h1>
    <p>
        <router-link to="/">{{ t("notFound.back") }}</router-link>
    </p>
</template>
