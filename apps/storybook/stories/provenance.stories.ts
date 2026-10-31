import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { type VNode, h } from "vue";
import TFingerspellingPlayer from "@ludvigalden-demo/tecken-design-system/components/TFingerspellingPlayer.vue";
import TLiveStatus from "@ludvigalden-demo/tecken-design-system/components/TLiveStatus.vue";
import TProvenanceBadge from "@ludvigalden-demo/tecken-design-system/components/TProvenanceBadge.vue";
import TProvenancePanel from "@ludvigalden-demo/tecken-design-system/components/TProvenancePanel.vue";
import { letters, record } from "../generated/records";

// Render functions, never runtime `template:` strings: runtime template
// compilation needs `unsafe-eval`, which the CSP forbids.

export default { title: "Domän/Provenance och status" } satisfies Meta;

function badgeRecorded(): VNode {
    return h(TProvenanceBadge, {
        status: "recorded",
        sourceLabel: "Wikimedia Commons",
    });
}

function badgeLinkOut(): VNode {
    return h(TProvenanceBadge, {
        status: "link-out",
        sourceLabel: "Svenskt teckenspråkslexikon",
    });
}

function badgeUnsupported(): VNode {
    return h(TProvenanceBadge, { status: "unsupported", sourceLabel: "" });
}

function panel(): VNode {
    return h(TProvenancePanel, { provenance: record.provenance });
}

function status(): VNode {
    return h(TLiveStatus, { message: "Ett inspelat yttrande hittades." });
}

function fingerspelling(): VNode {
    return h(TFingerspellingPlayer, { word: "hej", letters });
}

export const BadgeInspelad: StoryObj = { render: () => badgeRecorded };
export const BadgeLank: StoryObj = { render: () => badgeLinkOut };
export const BadgeIngenInspelning: StoryObj = {
    render: () => badgeUnsupported,
};
export const Kallpanel: StoryObj = { render: () => panel };
export const Statusrad: StoryObj = { render: () => status };
export const Fingerstavning: StoryObj = { render: () => fingerspelling };
