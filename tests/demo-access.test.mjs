import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { demoAccessDenial } from "../lib/demo-access.mjs";
import { bindingReads } from "./fixtures/cloudflare-runtime.mjs";

test("the demo barrier denies production even with localhost URLs or spoofed identity headers", async () => {
  for (const origin of ["https://keel.example", "http://localhost:3000", "http://127.0.0.1:3000"]) {
    const request = new Request(`${origin}/api/expenses`, { headers: { origin, "oai-authenticated-user-id": "claimed-owner", "oai-authenticated-user-email": "owner@example.com", "x-forwarded-host": "localhost:3000" } });
    for (const development of [false, undefined, "development"]) {
      const denied = demoAccessDenial(request, development);
      assert.equal(denied.status, 503);
      assert.equal(denied.headers.get("cache-control"), "no-store");
      assert.match((await denied.json()).error, /Real sign-in and permissions/);
    }
  }
});

test("local writes require an exact origin and cross-site reads are denied", () => {
  const origin = "http://localhost:3000";
  for (const method of ["POST", "PATCH", "DELETE"]) {
    for (const headers of [{}, { origin: "null" }, { origin: "http://localhost:3001" }, { origin: "http://127.0.0.1:3000" }, { origin, "sec-fetch-site": "cross-site" }, { origin, "sec-fetch-site": "same-site" }]) {
      assert.equal(demoAccessDenial(new Request(`${origin}/api/reset`, { method, headers }), true).status, 403);
    }
    assert.equal(demoAccessDenial(new Request(`${origin}/api/reset`, { method, headers: { origin, "sec-fetch-site": "same-origin" } }), true), null);
  }
  for (const headers of [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) assert.equal(demoAccessDenial(new Request(`${origin}/api/export`, { headers }), true).status, 403);
  for (const local of [origin, "http://127.0.0.1:3000", "http://[::1]:3000"]) assert.equal(demoAccessDenial(new Request(`${local}/api/expenses`), true), null);
  for (const host of ["localhost.evil.example", "192.168.1.10", "keel.example"]) assert.equal(demoAccessDenial(new Request(`http://${host}/api/expenses`, { headers: { "x-forwarded-host": "localhost" } }), true).status, 403);
});

test("every compiled production API handler denies access before touching storage or request bodies", async () => {
  // The guard and handlers are real build output. Only the platform binding
  // module is substituted, because Node cannot load cloudflare: URLs.
  register("./fixtures/cloudflare-loader.mjs", import.meta.url);
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
  const routes = (await readdir(new URL("../app/api", import.meta.url), { recursive: true })).filter((path) => path.replaceAll("\\", "/").endsWith("/route.ts"));
  let calls = 0;
  const forbiddenStorage = new Proxy({}, { get() { calls++; throw new Error("Production guard must run before storage access"); } });
  let handlers = 0;
  for (const file of routes) {
    const normalized = file.replaceAll("\\", "/");
    const source = await readFile(new URL(`../app/api/${normalized}`, import.meta.url), "utf8");
    const path = "/api/" + normalized.replace(/\/route\.ts$/, "").replace(/\[[^\]]+\]/g, "known-record");
    for (const [, method] of source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g)) {
      handlers++;
      const response = await worker.fetch(new Request(`https://keel.example${path}`, {
        method, headers: { origin: "https://keel.example", "content-type": "application/json", "x-keel-ai-request": "1", "oai-authenticated-user-id": "claimed-owner" },
        ...(!["GET", "HEAD"].includes(method) ? { body: "not even valid JSON" } : {}),
      }), { DB: forbiddenStorage, RECEIPTS: forbiddenStorage, OPENAI_API_KEY: "unit-test-not-a-real-key", ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(response.status, 503, `${method} ${path}: ${await response.clone().text()}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match((await response.json()).error, /Real sign-in and permissions/);
    }
  }
  assert.equal(handlers, 15, "Keep the API coverage inventory current when adding a route.");
  assert.equal(calls, 0);
  assert.deepEqual(bindingReads, []);
});
