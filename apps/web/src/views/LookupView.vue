<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { ValidationService } from "@fkui/logic";
import { FButton, FTextField, FValidationForm, useModal } from "@fkui/vue";
import TLiveStatus from "@ludvigalden-demo/tecken-design-system/components/TLiveStatus.vue";
import TSignResultSkeleton from "@ludvigalden-demo/tecken-design-system/components/TSignResultSkeleton.vue";
import { useLookupStore } from "../stores/lookup";
import SuggestConfirmModal from "../components/SuggestConfirmModal.vue";
import type { Utterance } from "../api/client";
import UtteranceResult from "../components/UtteranceResult.vue";
import UnsupportedResult from "../components/UnsupportedResult.vue";
import FingerspellingResult from "../components/FingerspellingResult.vue";
import { revealResult } from "./reveal-result";
import { phraseFromQuery } from "../route-query";

/**
 * The URL is the single source of truth for the search: a submit writes
 * `?q=<phrase>`, and the page runs the lookup from the query whenever it
 * appears or changes, including on a fresh load and on back/forward
 * navigation. Leaving the page and coming back therefore restores the same
 * search from the URL, or an empty page when there was none, never a
 * stale result next to an empty, already-validated field.
 */

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useLookupStore();
const { state, result, unsupported, letters, word } = storeToRefs(store);
const modal = useModal();

const phrase = ref("");
const status = ref("");
const resultHeading = useTemplateRef<HTMLHeadingElement>("resultHeading");

function queryText(): string {
    return phraseFromQuery(route.query);
}

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
    revealResult(resultHeading.value);
}

const STATUS_KEYS = {
    idle: "",
    loading: "",
    result: "lookup.status.result",
    suggested: "lookup.status.suggested",
    confirming: "lookup.status.suggested",
    unsupported: "lookup.status.unsupported",
    error: "lookup.status.error",
    fingerspelling: "lookup.status.fingerspelling",
} as const;

/** Runs the search the URL names; an empty query is the empty page. */
async function runFromQuery(focus: boolean): Promise<void> {
    const text = queryText();
    phrase.value = text;
    if (!text) {
        store.reset();
        status.value = "";
        return;
    }
    status.value = t("lookup.loading");
    await store.lookup(text, confirmSuggestion);
    const key = STATUS_KEYS[state.value];
    status.value = key ? t(key) : t("lookup.suggestedNone");
    if (focus) {
        await focusOutcome();
    }
}

async function onSubmit(): Promise<void> {
    const text = phrase.value.trim();
    if (text === queryText()) {
        // Same search again (e.g. a retry): the URL does not change.
        await runFromQuery(true);
        return;
    }
    await router.push({ query: { q: text } });
}

watch(
    () => route.query.q,
    async () => {
        await runFromQuery(true);
    },
);

/**
 * FKUI keeps a field's validation state (touched, submitted) by element id
 * across mounts. A field the URL filled, or an empty field on a fresh
 * visit, starts clean, so no stale "Fyll i text" error appears.
 */
function resetValidation(): void {
    const field = document.querySelector("#phrase");
    ValidationService.resetState(field);
    // Re-run validation so the field shows its fresh (not-submitted) state.
    if (field) {
        ValidationService.validateElement(field);
    }
}

onMounted(async () => {
    resetValidation();
    // Arriving with a query (a link, a reload, back navigation) restores
    // that search without taking focus away from where the router put it.
    await runFromQuery(false);
    await nextTick();
    resetValidation();
});

async function onRetry(): Promise<void> {
    await runFromQuery(true);
}
</script>

<template>
    <h1 class="t-focus-target" tabindex="-1">{{ t("lookup.heading") }}</h1>
    <p class="lookup-intro">
        {{ t("lookup.intro") }}
        <a href="https://teckensprakslexikon.su.se/" rel="noopener noreferrer">{{ t("lookup.lexikonLink") }}</a
        >.
    </p>
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

    <section v-if="state === 'loading'" class="result-section">
        <!-- The result's heading text for this query, so it wraps the same
             and the grid does not move; the live status line already says
             "Söker…", so it is not announced. -->
        <h2 aria-hidden="true">{{ t("lookup.resultHeading", { text: queryText() }) }}</h2>
        <t-sign-result-skeleton
            :label="t('lookup.loading')"
            :source="t('provenance.recorded')"
            :caption="queryText()"
        />
    </section>

    <section v-else-if="state === 'result' && result" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.resultHeading", { text: result.text_sv }) }}
        </h2>
        <utterance-result :key="result.id" :utterance="result" />
    </section>

    <section v-else-if="state === 'fingerspelling'" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.fingerspellingHeading", { word }) }}
        </h2>
        <fingerspelling-result :key="word" :word :letters />
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
