<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ValidationService } from "@fkui/logic";
import { FButton, FTextField, FValidationForm } from "@fkui/vue";
import TLiveStatus from "@ludvigalden-demo/tecken-design-system/components/TLiveStatus.vue";
import TSignResultSkeleton from "@ludvigalden-demo/tecken-design-system/components/TSignResultSkeleton.vue";
import { matchPhrase } from "../api/client";
import type { Utterance } from "../api/client";
import { revealResult } from "./reveal-result";
import { wordFromQuery } from "../route-query";
import FingerspellingResult from "../components/FingerspellingResult.vue";

/**
 * Like the phrase search, the URL holds the word (`?ord=`), so leaving the
 * page and coming back restores the same spelling, or an empty page. The
 * spelling starts at once, in the shared result layout.
 */

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const word = ref("");
const spelled = ref("");
const letters = ref<Utterance[]>([]);
const status = ref("");
const failed = ref(false);
const loading = ref(false);
const resultHeading = useTemplateRef<HTMLHeadingElement>("resultHeading");

function queryWord(): string {
    return wordFromQuery(route.query);
}

async function spellFromQuery(focus: boolean): Promise<void> {
    const text = queryWord();
    word.value = text;
    letters.value = [];
    failed.value = false;
    status.value = "";
    if (!text) {
        return;
    }
    let outcome;
    loading.value = true;
    status.value = t("lookup.loading");
    try {
        outcome = await matchPhrase(text, "fingerspell");
    } catch {
        failed.value = true;
        status.value = t("lookup.status.error");
        return;
    } finally {
        loading.value = false;
    }
    if (outcome.result === "fingerspelling") {
        letters.value = outcome.letters;
        spelled.value = outcome.word;
        status.value = t("lookup.status.fingerspelling");
        if (focus) {
            await nextTick();
            revealResult(resultHeading.value);
        }
    } else {
        failed.value = true;
        status.value = t("fingerspelling.unsupported");
    }
}

async function onSubmit(): Promise<void> {
    const text = word.value.trim().replaceAll(/\s+/g, "");
    if (text === queryWord()) {
        await spellFromQuery(true);
        return;
    }
    await router.push({ query: { ord: text } });
}

watch(
    () => route.query.ord,
    async () => {
        await spellFromQuery(true);
    },
);

/**
 * FKUI keeps a field's validation state (touched, submitted) by element id
 * across mounts. A field the URL filled, or an empty field on a fresh
 * visit, starts clean, so no stale "Fyll i text" error appears.
 */
function resetValidation(): void {
    const field = document.querySelector("#word");
    ValidationService.resetState(field);
    // Re-run validation so the field shows its fresh (not-submitted) state.
    if (field) {
        ValidationService.validateElement(field);
    }
}

onMounted(async () => {
    resetValidation();
    await spellFromQuery(false);
    await nextTick();
    resetValidation();
});
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
    <section v-if="loading" class="result-section">
        <!-- Same heading box as the result, so the grid does not move; the
             live status line already says "Söker…", so it is not announced. -->
        <h2 aria-hidden="true">{{ t("lookup.fingerspellingHeading", { word }) }}</h2>
        <t-sign-result-skeleton
            :label="t('lookup.loading')"
            :word
            :caption="word ? `Bokstaven ${[...word][0]?.toUpperCase() ?? ''}` : ''"
        />
    </section>
    <section v-else-if="letters.length > 0" class="result-section">
        <h2 ref="resultHeading" class="t-focus-target" tabindex="-1">
            {{ t("lookup.fingerspellingHeading", { word: spelled }) }}
        </h2>
        <fingerspelling-result :key="spelled" :word="spelled" :letters />
    </section>
</template>
