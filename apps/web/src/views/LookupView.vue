<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { FButton, FTextField, FValidationForm, useModal } from "@fkui/vue";
import TLiveStatus from "@ludvigalden-demo/tecken-design-system/components/TLiveStatus.vue";
import { useLookupStore } from "../stores/lookup";
import SuggestConfirmModal from "../components/SuggestConfirmModal.vue";
import type { Utterance } from "../api/client";
import UtteranceResult from "../components/UtteranceResult.vue";
import UnsupportedResult from "../components/UnsupportedResult.vue";
import FingerspellingResult from "../components/FingerspellingResult.vue";

const { t } = useI18n();
const store = useLookupStore();
const { state, result, unsupported, letters, word } = storeToRefs(store);
const modal = useModal();

const phrase = ref("");
const status = ref("");
const resultHeading = useTemplateRef<HTMLHeadingElement>("resultHeading");

async function confirmSuggestion(suggestion: Utterance): Promise<boolean> {
    status.value = t("lookup.status.suggested");
    const outcome = await modal.openModal(SuggestConfirmModal, {
        props: { suggestion },
    });
    return outcome.reason === "confirm";
}

async function focusOutcome(): Promise<void> {
    await nextTick();
    if (state.value === "idle") {
        document.querySelector<HTMLInputElement>("#phrase")?.focus();
        return;
    }
    resultHeading.value?.focus();
}

async function onSubmit(): Promise<void> {
    status.value = t("lookup.loading");
    await store.lookup(phrase.value, confirmSuggestion);
    const key = {
        idle: "",
        loading: "",
        result: "lookup.status.result",
        suggested: "lookup.status.suggested",
        confirming: "lookup.status.suggested",
        unsupported: "lookup.status.unsupported",
        error: "lookup.status.error",
        fingerspelling: "lookup.status.fingerspelling",
    }[state.value];
    status.value = key ? t(key) : t("lookup.suggestedNone");
    await focusOutcome();
}

async function onRetry(): Promise<void> {
    await onSubmit();
}
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("lookup.heading") }}</h1>
    <f-validation-form @submit="onSubmit">
        <f-text-field
            id="phrase"
            v-model="phrase"
            v-validation.required.maxLength="{ maxLength: { length: 200 } }"
            maxlength="200"
        >
            <template #default>{{ t("lookup.label") }}</template>
            <template #description="{ descriptionClass }">
                <span :class="descriptionClass">{{ t("lookup.description") }}</span>
            </template>
        </f-text-field>
        <f-button variant="primary" size="medium" type="submit">{{ t("lookup.submit") }}</f-button>
    </f-validation-form>

    <t-live-status :message="status" />

    <section v-if="state === 'result' && result" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.resultHeading", { text: result.text_sv }) }}
        </h2>
        <utterance-result :utterance="result" />
    </section>

    <section v-else-if="state === 'fingerspelling'" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.fingerspellingHeading", { word }) }}
        </h2>
        <fingerspelling-result :word :letters />
    </section>

    <section v-else-if="state === 'unsupported' && unsupported" class="unsupported-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.unsupportedHeading") }}
        </h2>
        <unsupported-result :outcome="unsupported" />
    </section>

    <section v-else-if="state === 'error'" class="unsupported-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">{{ t("lookup.errorHeading") }}</h2>
        <p>{{ t("lookup.errorBody") }}</p>
        <f-button variant="secondary" size="medium" type="button" @click="onRetry">
            {{ t("lookup.retry") }}
        </f-button>
    </section>
</template>
