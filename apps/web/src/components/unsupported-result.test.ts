import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import sv from "../locales/sv.json";
import type { Utterance } from "../api/client";
import type { UnsupportedResult as UnsupportedOutcome } from "../stores/lookup";
import UnsupportedResult from "./UnsupportedResult.vue";

const i18n = createI18n({ legacy: false, locale: "sv", messages: { sv } });

/** The link-out record "lexikon-hej" from content/utterances, in wire form. */
const record = JSON.parse(
    readFileSync(
        join(
            import.meta.dirname,
            "../../../../content/utterances/lexikon-hej.json",
        ),
        "utf8",
    ),
) as Pick<Utterance, "id" | "kind" | "text_sv" | "provenance"> & {
    link_out_url: string;
    review: { status: Utterance["review_status"] };
};
const linkOut: Utterance = {
    id: record.id,
    kind: record.kind,
    text_sv: record.text_sv,
    playable: false,
    link_out_url: record.link_out_url,
    provenance: record.provenance,
    review_status: record.review.status,
};

function render(
    outcome: UnsupportedOutcome,
): ReturnType<typeof mount<typeof UnsupportedResult>> {
    return mount(UnsupportedResult, {
        props: { outcome },
        global: {
            plugins: [i18n],
            stubs: {
                TProvenanceBadge: {
                    template: "<span class='badge-stub'></span>",
                },
            },
        },
    });
}

describe("UnsupportedResult", () => {
    it("lists what is supported and links (never embeds) the lexicon", () => {
        expect.hasAssertions();
        const wrapper = render({
            result: "unsupported",
            reason: "no_match",
            supported: ["hej", "bil"],
            link_outs: [linkOut],
        });
        expect(wrapper.text()).toContain("Det finns ingen inspelning");
        expect(wrapper.findAll("q").map((q) => q.text())).toEqual([
            "hej",
            "bil",
        ]);
        const a = wrapper.get("a");
        expect(a.attributes("href")).toBe(record.link_out_url);
        expect(wrapper.find("video").exists()).toBe(false);
        expect(wrapper.find("iframe").exists()).toBe(false);
    });

    it("explains the negation guard instead of guessing", () => {
        expect.hasAssertions();
        const wrapper = render({
            result: "unsupported",
            reason: "negation",
            supported: ["hej"],
            link_outs: [],
        });
        expect(wrapper.text()).toContain(
            "aldrig ett yttrande med motsatt betydelse",
        );
        expect(wrapper.findAll("q")).toHaveLength(0);
    });
});
