import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TProvenanceBadge from "./TProvenanceBadge.vue";
import TProvenancePanel from "./TProvenancePanel.vue";
import TLiveStatus from "./TLiveStatus.vue";
import TFingerspellingPlayer from "./TFingerspellingPlayer.vue";
import { corpusRecord, validMediaRecord } from "./fixtures/records";

describe("TProvenanceBadge", () => {
    it("carries text and an icon, never colour alone", () => {
        const wrapper = mount(TProvenanceBadge, {
            props: { status: "recorded", sourceLabel: "Wikimedia Commons" },
            global: {
                stubs: {
                    FBadge: { template: "<span><slot /></span>" },
                    FIcon: true,
                },
            },
        });
        expect(wrapper.text()).toContain("Inspelad källa: Wikimedia Commons");
    });

    it("names the link-out and unsupported states", () => {
        const link = mount(TProvenanceBadge, {
            props: { status: "link-out", sourceLabel: "Teckenspråkslexikon" },
            global: {
                stubs: {
                    FBadge: { template: "<span><slot /></span>" },
                    FIcon: true,
                },
            },
        });
        expect(link.text()).toContain("Länk till källa");
        const none = mount(TProvenanceBadge, {
            props: { status: "unsupported", sourceLabel: "" },
            global: {
                stubs: {
                    FBadge: { template: "<span><slot /></span>" },
                    FIcon: true,
                },
            },
        });
        expect(none.text()).toContain("Ingen inspelning");
    });
});

describe("TProvenancePanel", () => {
    it("shows all provenance terms including an unnamed signer", () => {
        const wrapper = mount(TProvenancePanel, {
            props: { provenance: validMediaRecord.provenance },
            global: {
                stubs: {
                    FExpandablePanel: {
                        template: "<div><slot name='title' /><slot /></div>",
                    },
                    FDefinitionList: {
                        props: { definitions: Array },
                        template:
                            "<dl><div v-for='d in definitions' :key='d.term'><dt>{{ d.term }}</dt><dd>{{ d.definition }}</dd></div></dl>",
                    },
                },
            },
        });
        const text = wrapper.text();
        expect(text).toContain("Källa");
        expect(text).toContain("Upphovsperson");
        const { provenance } = validMediaRecord;
        expect(provenance.signer).toBeNull();
        expect(text).toContain("Ej namngiven i källan");
        expect(text).toContain(provenance.author);
        expect(text).toContain(provenance.licence);
    });
});

describe("TLiveStatus", () => {
    it("is a polite status region", () => {
        const wrapper = mount(TLiveStatus, { props: { message: "Söker…" } });
        expect(wrapper.attributes("role")).toBe("status");
        expect(wrapper.attributes("aria-live")).toBe("polite");
        expect(wrapper.text()).toBe("Söker…");
    });
});

describe("TFingerspellingPlayer", () => {
    const letters = ["h", "e", "j"].map((letter) => ({
        id: `letter-${letter}`,
        letter,
        captionText: corpusRecord(`letter-${letter}`).caption?.text,
        sources: {
            mp4: `/media/letter-${letter}.mp4`,
            webm: `/media/letter-${letter}.webm`,
            captions: `/media/letter-${letter}.vtt`,
        },
    }));

    it("labels itself as letter-by-letter, not a sign for the word", () => {
        expect.hasAssertions();
        const wrapper = mount(TFingerspellingPlayer, {
            props: { word: "hej", letters: [] },
        });
        expect(wrapper.text()).toContain(
            "Fingerstavning – bokstav för bokstav",
        );
        expect(wrapper.text()).toContain("inte ett tecken för ordet");
    });

    it("steps through letters on explicit presses, plays each clip and announces it", async () => {
        expect.hasAssertions();
        const wrapper = mount(TFingerspellingPlayer, {
            props: { word: "hej", letters },
        });
        // Nothing plays before the first press.
        expect(wrapper.find("video").exists()).toBe(false);
        const button = wrapper.get("button");
        // FButton renders a native button: keyboard-operable by construction
        // (jsdom does not synthesize Enter/Space activation).
        expect(button.attributes("type")).toBe("button");
        const status = (): string => wrapper.get('[role="status"]').text();

        await button.trigger("click");
        expect(wrapper.emitted("played")?.[0]).toEqual(["h"]);
        expect(status()).toBe("Bokstav 1 av 3: H");
        expect(wrapper.get("source").attributes("src")).toBe(
            "/media/letter-h.mp4",
        );
        expect(wrapper.get("video").attributes("autoplay")).toBeUndefined();

        await button.trigger("click");
        expect(status()).toBe("Bokstav 2 av 3: E");
        expect(wrapper.get("source").attributes("src")).toBe(
            "/media/letter-e.mp4",
        );

        await button.trigger("click");
        expect(wrapper.emitted("played")?.[2]).toEqual(["j"]);

        await button.trigger("click");
        expect(wrapper.emitted("finished")?.[0]).toEqual(["hej"]);
        expect(status()).toBe("Klart: hej");
        expect(wrapper.find("video").exists()).toBe(false);
    });
});
