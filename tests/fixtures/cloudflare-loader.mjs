// Node-only compiled-route tests: resolve the Worker binding module to a trap.
// This loader is never imported by application source or deployment output.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: new URL("./cloudflare-runtime.mjs", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
}
