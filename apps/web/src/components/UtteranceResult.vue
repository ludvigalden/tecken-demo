<script setup lang="ts">
import { useI18n } from "vue-i18n";
import TProvenanceBadge from "@ludvigalden-demo/tecken-design-system/components/TProvenanceBadge.vue";
import TProvenancePanel from "@ludvigalden-demo/tecken-design-system/components/TProvenancePanel.vue";
import TSignResult from "@ludvigalden-demo/tecken-design-system/components/TSignResult.vue";
import TSignVideo from "@ludvigalden-demo/tecken-design-system/components/TSignVideo.vue";
import type { Utterance } from "../api/client";

/**
 * A recorded result in the shared layout: the clip (autoplaying, muted),
 * then what the phrase is, the source badge, and the full source details
 * last. The badge names the source in words; the panel holds the rest.
 */
const props = defineProps<{ utterance: Utterance }>();
const { t } = useI18n();
</script>

<template>
    <t-sign-result :label="t('lookup.resultRegion')">
        <template #media>
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
                autoplay
            />
        </template>
        <t-provenance-badge status="recorded" :source-label="t('provenance.recorded')" />
        <template #details>
            <t-provenance-panel :provenance="props.utterance.provenance" />
        </template>
    </t-sign-result>
</template>
