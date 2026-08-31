import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readJsonResponse } from "../lib/http-response.mjs";

test("receipt clients translate a plain-text 413 into useful guidance", async () => {
  await assert.rejects(
    readJsonResponse(new Response("Payload Too Large", { status: 413 }), {
      fallback: "Unexpected response.",
      tooLarge: "This receipt could not be uploaded. Choose a file up to 8 MB.",
    }),
    /Choose a file up to 8 MB/,
  );
});

test("receipt clients accept JSON and hide malformed server responses", async () => {
  assert.deepEqual(
    await readJsonResponse(Response.json({ error: "Provider unavailable." })),
    { error: "Provider unavailable." },
  );
  await assert.rejects(
    readJsonResponse(new Response("<html>internal details</html>", { status: 502 }), {
      fallback: "The receipt reader returned an unexpected response. Please try again.",
    }),
    /receipt reader returned an unexpected response/,
  );
});

test("the local request bridge leaves room for the documented 8 MB receipt cap", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /bodySizeLimit:\s*["']9mb["']/);
});
