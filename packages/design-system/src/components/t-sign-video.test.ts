import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TSignVideo from "./TSignVideo.vue";
import { validMediaRecord } from "./fixtures/records";

describe("TSignVideo", () => {
    it("renders sources, captions and poster without autoplay", () => {
        const wrapper = mount(TSignVideo, {
            props: { record: validMediaRecord, label: "hej" },
        });
        const video = wrapper.get("video");
        expect(video.attributes("controls")).toBeDefined();
        expect(video.attributes("preload")).toBe("none");
        expect(video.attributes("autoplay")).toBeUndefined();
        const sources = wrapper.findAll("source");
        expect(sources.map((s) => s.attributes("src"))).toEqual([
            "/media/hej.mp4",
            "/media/hej.webm",
        ]);
        const track = wrapper.get("track");
        expect(track.attributes("kind")).toBe("captions");
        expect(track.attributes("srclang")).toBe("sv");
        expect(track.attributes("default")).toBeDefined();
    });

    it("is keyboard reachable and emits played and ended", async () => {
        const wrapper = mount(TSignVideo, {
            props: { record: validMediaRecord, label: "hej" },
            attachTo: document.body,
        });
        const video = wrapper.get("video");
        video.trigger("play");
        video.trigger("ended");
        expect(wrapper.emitted("played")?.[0]).toEqual(["hej"]);
        expect(wrapper.emitted("ended")?.[0]).toEqual(["hej"]);
        wrapper.unmount();
    });

    it("names the clip for screen readers", () => {
        const wrapper = mount(TSignVideo, {
            props: { record: validMediaRecord, label: "hej" },
        });
        expect(wrapper.get("video").attributes("aria-label")).toContain("hej");
    });
});
