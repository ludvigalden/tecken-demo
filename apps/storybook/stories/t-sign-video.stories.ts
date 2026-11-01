import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { type VNode, h } from "vue";
import TSignVideo from "@ludvigalden-demo/tecken-design-system/components/TSignVideo.vue";
import { record } from "../generated/records";

const meta: Meta = { title: "Domän/TSignVideo" };
export default meta;

function recorded(): VNode {
    const mp4 = record.video?.file.replace(/^content/, "") ?? "";
    return h(TSignVideo, {
        id: record.id,
        label: "hej",
        captionText: record.caption?.text,
        sources: {
            mp4,
            webm: record.video_alt?.file.replace(/^content/, "") ?? "",
            captions: mp4.replace(/\.mp4$/, ".vtt"),
            poster: record.poster?.file.replace(/^content/, ""),
        },
    });
}

export const Inspelat: StoryObj = { render: () => recorded };
