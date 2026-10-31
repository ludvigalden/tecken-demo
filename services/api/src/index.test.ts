import { describe, expect, it } from "vitest";
import { workspace } from "./index";

describe("api", () => {
    it("names its workspace", () => {
        expect(workspace).toBe("@ludvigalden-demo/tecken-api");
    });
});
