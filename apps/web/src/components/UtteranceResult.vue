<script setup lang="ts">
import { useI18n } from "vue-i18n";
import TProvenanceBadge from "@ludvigalden-demo/tecken-design-system/components/TProvenanceBadge.vue";
import TProvenancePanel from "@ludvigalden-demo/tecken-design-system/components/TProvenancePanel.vue";
import TSignVideo from "@ludvigalden-demo/tecken-design-system/components/TSignVideo.vue";
import type { Utterance } from "../api/client";

/**
 * Provenance first: the badge and the source panel render before the video,
 * so the user knows where a recording comes from before pressing play.
 */
const props = defineProps<{ utterance: Utterance }>();
const { t } = useI18n();
</script>

<template>
    <t-provenance-badge status="recorded" :source-label="t('provenance.recorded')" />
    <t-provenance-panel :provenance="props.utterance.provenance" />
    <p>{{ t("provenance.reviewStatus") }}</p>
    <t-sign-video
        v-if="
            props.utterance.playable &&
            props.utterance.video &&
            props.utterance.video_alt &&
            props.utterance.captions_url
        "
        :id="props.utterance.id"
        :label="props.utterance.text_sv"
        :caption-text="props.utterance.caption_text"
        :sources="{
            mp4: props.utterance.video.url,
            webm: props.utterance.video_alt.url,
            captions: props.utterance.captions_url,
            poster: props.utterance.poster_url,
        }"
    />
</template>
