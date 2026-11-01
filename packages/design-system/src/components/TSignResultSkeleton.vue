<script setup lang="ts">
/**
 * Loading placeholder with the final result's geometry: TSignResult's grid,
 * TSignVideo's player box, and inert copies of the badge (or, with `word`,
 * the fingerspelling controls) and the collapsed "Om källan" panel built
 * from the same classes, so nothing moves when the result replaces it.
 * A11y: `aria-busy`, named region; every block is aria-hidden and inert,
 * so it announces nothing (the page's status line says "Söker…"). The
 * pulse is off under reduced motion.
 */
import TProvenanceBadge from "./TProvenanceBadge.vue";

defineProps<{
    label: string;
    /** Mirror TFingerspellingPlayer's information column for this word. */
    word?: string;
    /** The result's badge source label, so the copy wraps the same. */
    source?: string;
    /**
     * The video caption the result will show (the phrase, or "Bokstaven X"),
     * so the caption block wraps to the same number of lines.
     */
    caption?: string;
}>();
</script>

<template>
    <section class="t-sign-result t-sign-result-skeleton" :aria-label="label" aria-busy="true">
        <div class="t-sign-result__media" aria-hidden="true">
            <!-- A real figcaption in a real figure, text hidden: the same
                 box as TSignVideo's caption at every width. -->
            <figure class="t-sign-video t-skeleton-ghost-figure">
                <figcaption class="t-skeleton-ghost">
                    <span>{{ caption || "\u00a0" }}</span>
                </figcaption>
                <div class="t-skeleton t-skeleton--player"></div>
            </figure>
        </div>
        <div class="t-sign-result__info" aria-hidden="true" inert>
            <template v-if="word !== undefined">
                <p>
                    Fingerstavning – bokstav för bokstav, inte ett tecken för ordet:
                    <strong>{{ word }}</strong>
                </p>
                <p class="t-fingerspelling__current">&nbsp;</p>
                <div class="t-live-status"></div>
                <div class="t-fingerspelling__steps">
                    <span class="button button--secondary button--medium">Föregående bokstav</span>
                    <span class="button button--secondary button--medium">Nästa bokstav</span>
                </div>
            </template>
            <t-provenance-badge v-else class="t-skeleton-ghost" status="recorded" :source-label="source ?? ''" />
            <div class="expandable-panel t-skeleton-ghost">
                <!-- An h3 like the real panel's, for the same line box; the
                     column is aria-hidden and inert, so it is not in the
                     heading outline. -->
                <h3 class="expandable-panel__heading">
                    <button type="button" disabled>
                        <span class="expandable-panel__title"
                            ><span class="expandable-panel__title__text">Om källan</span></span
                        >
                    </button>
                </h3>
            </div>
        </div>
    </section>
</template>
