import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { type VNode, h } from "vue";
import TSignVideo from "@ludvigalden-demo/tecken-design-system/components/TSignVideo.vue";
import { record } from "../generated/records";

const meta: Meta = { title: "Domän/TSignVideo" };
export default meta;

function recorded(): VNode {
    return h(TSignVideo, { record, label: "hej" });
}

export const Inspelat: StoryObj = { render: () => recorded };
