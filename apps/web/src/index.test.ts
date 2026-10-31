import { describe, expect, it } from "vitest";
import { workspace } from "./index";

describe("web", () => {
    it("names its workspace", () => {
        expect(workspace).toBe("@ludvigalden-demo/tecken-web");
    });
});
