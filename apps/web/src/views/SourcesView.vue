<script setup lang="ts">
import { useI18n } from "vue-i18n";
import records from "../generated/sources.json";

/**
 * Full attribution and licence URIs for every clip and every link-out: the
 * licence notice travels with every redistributed copy. The list is
 * generated from content/ at build time (src/generated/sources.json, drift
 * gated and checked against /v1/utterances), so the page has its data on
 * the first paint, with no request and no layout shift.
 */
const { t } = useI18n();
const clips = records.filter((u) => u.kind !== "link-out");
const linkOuts = records.filter((u) => u.kind === "link-out");
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("sources.heading") }}</h1>
    <p>{{ t("sources.intro") }}</p>
    <p>{{ t("sources.transformations") }}</p>
    <h2>{{ t("sources.clipsHeading") }}</h2>
    <ul>
        <li v-for="clip in clips" :key="clip.id">
            <q>{{ clip.text_sv }}</q> — {{ t("sources.author") }}: {{ clip.provenance.author }};
            {{ t("sources.licence") }}:
            <a :href="clip.provenance.licence_url" rel="noopener noreferrer license">{{ clip.provenance.licence }}</a
            >; {{ t("sources.source") }}:
            <a :href="clip.provenance.source_url" rel="noopener noreferrer">{{ clip.provenance.source_title }}</a>
            <template v-if="clip.provenance.permission_ticket">
                ; {{ t("sources.ticket") }}: {{ clip.provenance.permission_ticket }}
            </template>
        </li>
    </ul>
    <h2>{{ t("sources.linkOutsHeading") }}</h2>
    <ul>
        <li v-for="link in linkOuts" :key="link.id">
            <a :href="link.link_out_url" rel="noopener noreferrer">{{ link.provenance.source_title }}</a>
            — {{ link.provenance.author }}; {{ t("sources.licence") }}:
            <a :href="link.provenance.licence_url" rel="noopener noreferrer license">{{ link.provenance.licence }}</a>
        </li>
    </ul>
</template>
