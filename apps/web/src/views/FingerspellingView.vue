<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { FButton, FTextField, FValidationForm } from "@fkui/vue";
import TLiveStatus from "@ludvigalden-demo/tecken-design-system/components/TLiveStatus.vue";
import { matchPhrase } from "../api/client";
import type { Utterance } from "../api/client";
import FingerspellingResult from "../components/FingerspellingResult.vue";

const { t } = useI18n();
const word = ref("");
const spelled = ref("");
const letters = ref<Utterance[]>([]);
const status = ref("");
const failed = ref(false);
const resultHeading = useTemplateRef<HTMLHeadingElement>("resultHeading");

async function onSubmit(): Promise<void> {
    letters.value = [];
    failed.value = false;
    const text = word.value.trim().replaceAll(/\s+/g, "");
    let outcome;
    try {
        outcome = await matchPhrase(text, "exact");
    } catch {
        failed.value = true;
        status.value = t("lookup.status.error");
        return;
    }
    if (outcome.result === "fingerspelling") {
        letters.value = outcome.letters;
        spelled.value = outcome.word;
        status.value = t("lookup.status.fingerspelling");
        await nextTick();
        resultHeading.value?.focus();
    } else {
        failed.value = true;
        status.value = t("fingerspelling.unsupported");
    }
}
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("fingerspelling.heading") }}</h1>
    <f-validation-form @submit="onSubmit">
        <f-text-field
            id="word"
            v-model="word"
            v-validation.required.maxLength="{ maxLength: { length: 40 } }"
            maxlength="40"
        >
            <template #default>{{ t("fingerspelling.label") }}</template>
            <template #description="{ descriptionClass }">
                <span :class="descriptionClass">{{ t("fingerspelling.description") }}</span>
            </template>
        </f-text-field>
        <f-button variant="primary" size="medium" type="submit">{{ t("fingerspelling.submit") }}</f-button>
    </f-validation-form>
    <t-live-status :message="status" />
    <p v-if="failed">{{ t("fingerspelling.unsupported") }}</p>
    <section v-if="letters.length > 0" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.fingerspellingHeading", { word: spelled }) }}
        </h2>
        <fingerspelling-result :word="spelled" :letters />
    </section>
</template>
