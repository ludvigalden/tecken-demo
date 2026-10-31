import { describe, expect, it } from "vitest";
import { workspace } from "./index";

describe("mediaPipeline", () => {
    it("names its workspace", () => {
        expect(workspace).toBe("@ludvigalden-demo/tecken-media-pipeline");
    });
});
