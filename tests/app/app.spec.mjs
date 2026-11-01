// End-to-end: the built app through the real Node server over local TLS, in
// every declared browser. Each journey lives in journeys.mjs and is shared
// with the local runner (run-local.mjs).
import { expect, test } from "@playwright/test";
import { JOURNEYS, armCspCollector, axeNegativeControl } from "./journeys.mjs";

for (const journey of JOURNEYS) {
    test(journey.name, async ({ context, page, browserName }) => {
        const csp = await armCspCollector(context);
        await journey.run({ page, csp, browserName });
    });
}

test("axe negative control: a planted image without alt text fails the gate", async ({
    page,
}) => {
    expect(await axeNegativeControl(page)).toContain("image-alt(1)");
});
