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
    it("starts collapsed, expands on toggle and shows the attribution", async () => {
        expect.hasAssertions();
        // The real FKUI panel, which must open on click.
        const wrapper = mount(TProvenancePanel, {
            props: { provenance: validMediaRecord.provenance },
            attachTo: document.body,
        });
        const button = wrapper.get("button");
        expect(button.attributes("aria-expanded")).toBe("false");
        await button.trigger("click");
        expect(button.attributes("aria-expanded")).toBe("true");
        const text = wrapper.text();
        expect(text).toContain("Upphovsperson");
        const { provenance } = validMediaRecord;
        expect(provenance.signer).toBeNull();
        expect(text).toContain("Ej namngiven i källan");
        expect(text).toContain(provenance.author);
        expect(text).toContain(provenance.licence);
        const links = wrapper.findAll("dd a").map((a) => a.attributes("href"));
        expect(links).toContain(provenance.licence_url);
        expect(links).toContain(provenance.source_url);
        await button.trigger("click");
        expect(button.attributes("aria-expanded")).toBe("false");
        wrapper.unmount();
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

    it("shows the first letter at once and advances when a clip ends", async () => {
        expect.hasAssertions();
        const wrapper = mount(TFingerspellingPlayer, {
            props: { word: "hej", letters, autoplay: true },
        });
        const status = (): string => wrapper.get('[role="status"]').text();
        // No click needed: the first letter's clip is there immediately.
        expect(status()).toBe("Bokstav 1 av 3: H");
        expect(wrapper.get("source").attributes("src")).toBe(
            "/media/letter-h.mp4",
        );
        await wrapper.get("video").trigger("ended");
        expect(status()).toBe("Bokstav 2 av 3: E");
        await wrapper.get("video").trigger("ended");
        expect(status()).toBe("Bokstav 3 av 3: J");
        await wrapper.get("video").trigger("ended");
        expect(wrapper.emitted("finished")?.[0]).toEqual(["hej"]);
    });

    it("steps by hand, and a hand step stops the automatic sequence", async () => {
        expect.hasAssertions();
        const wrapper = mount(TFingerspellingPlayer, {
            props: { word: "hej", letters, autoplay: true },
        });
        const status = (): string => wrapper.get('[role="status"]').text();
        const [previous, next] = wrapper.findAll("button");
        // FKUI keeps a disabled button focusable and marks it aria-disabled.
        expect(previous?.attributes("aria-disabled")).toBe("true");
        expect(next?.attributes("aria-disabled")).toBe("false");
        await next?.trigger("click");
        expect(status()).toBe("Bokstav 2 av 3: E");
        await previous?.trigger("click");
        expect(status()).toBe("Bokstav 1 av 3: H");
        // The sequence is off now: an ending clip stays on its letter.
        await wrapper.get("video").trigger("ended");
        expect(status()).toBe("Bokstav 1 av 3: H");
    });
});
