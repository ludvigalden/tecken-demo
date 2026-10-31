import { describe, expect, it } from "vitest";
import { workspace } from "./index";

describe("designSystem", () => {
    it("names its workspace", () => {
        expect(workspace).toBe("@ludvigalden-demo/tecken-design-system");
    });
});
