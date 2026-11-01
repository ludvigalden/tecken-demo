<script setup lang="ts">
import { ref } from "vue";
import { FExpandablePanel } from "@fkui/vue";
import type { ProvenanceRecord } from "@ludvigalden-demo/tecken-contracts";

/**
 * A11y contract:
 * - The expandable panel is a real button (FKUI): keyboard operable, with
 *   visible focus and an expanded/collapsed state announced to AT. FKUI's
 *   panel is controlled: it shows what `expanded` says and only emits
 *   `toggle`, so the open state lives here.
 * - The list pairs every term with its value (`dl`/`dt`/`dd`); the source
 *   and the licence are links, so the attribution travels with the copy.
 */

const props = defineProps<{
    provenance: ProvenanceRecord;
    /** Start open (used in stories and tests). */
    open?: boolean;
}>();

const expanded = ref(props.open ?? false);

function onToggle(): void {
    expanded.value = !expanded.value;
}
</script>

<template>
    <f-expandable-panel :expanded header-tag="h3" @toggle="onToggle">
        <template #title>Om källan</template>
        <template #default>
            <dl class="definition-list t-provenance">
                <dt class="definition-list__term">Källa</dt>
                <dd class="definition-list__definition">
                    <a :href="props.provenance.source_url" rel="noopener noreferrer">{{
                        props.provenance.source_title
                    }}</a>
                </dd>
                <dt class="definition-list__term">Upphovsperson</dt>
                <dd class="definition-list__definition">{{ props.provenance.author }}</dd>
                <dt class="definition-list__term">Tecknare</dt>
                <dd class="definition-list__definition">
                    {{ props.provenance.signer ?? "Ej namngiven i källan" }}
                </dd>
                <dt class="definition-list__term">Utgivare</dt>
                <dd class="definition-list__definition">{{ props.provenance.publisher }}</dd>
                <dt class="definition-list__term">Licens</dt>
                <dd class="definition-list__definition">
                    <a :href="props.provenance.licence_url" rel="noopener noreferrer license">{{
                        props.provenance.licence
                    }}</a>
                </dd>
                <dt class="definition-list__term">Hämtad</dt>
                <dd class="definition-list__definition">{{ props.provenance.retrieved_at }}</dd>
                <dt class="definition-list__term">Granskning</dt>
                <dd class="definition-list__definition">Publicerad av källan, inte granskad här</dd>
            </dl>
        </template>
    </f-expandable-panel>
</template>
