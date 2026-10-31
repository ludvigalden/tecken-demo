<script setup lang="ts">
import { FDefinitionList, FExpandablePanel } from "@fkui/vue";
import type { ProvenanceRecord } from "@ludvigalden-demo/tecken-contracts";

/**
 * A11y contract:
 * - The expandable panel is a real button (FKUI): keyboard operable, with
 *   visible focus and an expanded/collapsed state announced to AT.
 * - The definition list pairs every term with its value; the licence is a
 *   link to its deed, so the licence travels with the copy.
 */

defineProps<{
    provenance: ProvenanceRecord;
}>();
</script>

<template>
    <f-expandable-panel>
        <template #title>Om källan</template>
        <template #default>
            <f-definition-list
                :definitions="[
                    { term: 'Källa', definition: provenance.source_title },
                    { term: 'Upphovsperson', definition: provenance.author },
                    {
                        term: 'Tecknare',
                        definition: provenance.signer ?? 'Ej namngiven i källan',
                    },
                    { term: 'Utgivare', definition: provenance.publisher },
                    {
                        term: 'Licens',
                        definition: `${provenance.licence} (${provenance.licence_url})`,
                    },
                    { term: 'Hämtad', definition: provenance.retrieved_at },
                ]"
            />
        </template>
    </f-expandable-panel>
</template>
