import { describe, expect, it, vi } from "vitest";
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
    it("renders sources, captions and poster, and does not start by itself without autoplay", () => {
        expect.hasAssertions();
        const wrapper = mount(TSignVideo, { props });
        const video = wrapper.get("video");
        expect(video.attributes("controls")).toBeDefined();
        expect(video.attributes("preload")).toBe("none");
        expect(video.attributes("autoplay")).toBeUndefined();
        expect(video.attributes("playsinline")).toBeDefined();
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

    it("with autoplay, starts muted unless the user prefers reduced motion", () => {
        expect.hasAssertions();
        for (const reduce of [false, true]) {
            const muted: boolean[] = [];
            const play = vi
                .spyOn(HTMLMediaElement.prototype, "play")
                .mockImplementation(function stub(this: HTMLMediaElement) {
                    muted.push(this.muted);
                    return Promise.resolve();
                });
            vi.stubGlobal("matchMedia", (query: string) => ({
                matches: reduce && query.includes("reduce"),
            }));
            try {
                mount(TSignVideo, { props: { ...props, autoplay: true } });
                expect(muted, `reduce=${String(reduce)}`).toEqual(
                    reduce ? [] : [true],
                );
            } finally {
                play.mockRestore();
                vi.unstubAllGlobals();
            }
        }
    });

    it("reports a user pause, not the natural end of the clip", async () => {
        expect.hasAssertions();
        const wrapper = mount(TSignVideo, { props });
        await wrapper.get("video").trigger("pause");
        expect(wrapper.emitted("paused")?.[0]).toEqual(["hej"]);
    });

    it("ends a clip that freezes on its last frame without an ended event", async () => {
        expect.hasAssertions();
        vi.useFakeTimers();
        try {
            const wrapper = mount(TSignVideo, { props });
            const video = wrapper.get("video").element;
            Object.defineProperty(video, "duration", {
                configurable: true,
                value: 1.934,
            });
            Object.defineProperty(video, "currentTime", {
                configurable: true,
                value: 1.9333,
            });
            Object.defineProperty(video, "paused", {
                configurable: true,
                value: false,
            });
            await wrapper.get("video").trigger("play");
            await wrapper.get("video").trigger("timeupdate");
            vi.advanceTimersByTime(400);
            expect(wrapper.emitted("ended")).toEqual([["hej"]]);
            await wrapper.get("video").trigger("ended");
            expect(wrapper.emitted("ended")).toHaveLength(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
