import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import TSignVideo from "./TSignVideo.vue";

const props = {
    id: "hej",
    label: "hej",
    captionText: "hej",
    sources: {
        mp4: "/media/hej.mp4",
        webm: "/media/hej.webm",
        captions: "/media/hej.vtt",
        poster: "/media/hej.webp",
    },
};

describe("TSignVideo", () => {
    it("renders sources, captions and poster without autoplay", () => {
        expect.hasAssertions();
        const wrapper = mount(TSignVideo, { props });
        const video = wrapper.get("video");
        expect(video.attributes("controls")).toBeDefined();
        expect(video.attributes("preload")).toBe("none");
        expect(video.attributes("autoplay")).toBeUndefined();
        expect(video.attributes("poster")).toBe("/media/hej.webp");
        const sources = wrapper.findAll("source");
        expect(
            sources.map((s) => [s.attributes("src"), s.attributes("type")]),
        ).toEqual([
            ["/media/hej.mp4", "video/mp4"],
            ["/media/hej.webm", "video/webm"],
        ]);
        const track = wrapper.get("track");
        expect(track.attributes("kind")).toBe("captions");
        expect(track.attributes("srclang")).toBe("sv");
        expect(track.attributes("src")).toBe("/media/hej.vtt");
        expect(track.attributes("default")).toBeDefined();
    });

    it("emits played and ended with its id", async () => {
        expect.hasAssertions();
        const wrapper = mount(TSignVideo, { props });
        const video = wrapper.get("video");
        await video.trigger("play");
        await video.trigger("ended");
        expect(wrapper.emitted("played")?.[0]).toEqual(["hej"]);
        expect(wrapper.emitted("ended")?.[0]).toEqual(["hej"]);
    });

    it("names the clip for screen readers", () => {
        expect.hasAssertions();
        const wrapper = mount(TSignVideo, { props });
        expect(wrapper.get("video").attributes("aria-label")).toBe(
            "hej — inspelat tecken, hej",
        );
    });
});
