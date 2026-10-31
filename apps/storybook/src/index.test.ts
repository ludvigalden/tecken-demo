import { describe, expect, it } from "vitest";
import { workspace } from "./index";

describe("storybook", () => {
    it("names its workspace", () => {
        expect(workspace).toBe("@ludvigalden-demo/tecken-storybook");
    });
});
