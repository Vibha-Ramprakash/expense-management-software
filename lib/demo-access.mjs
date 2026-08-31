// Temporary deployment barrier, not user authentication. Remove only when
// every route has verified identity, membership and record authorization.
export function demoAccessDenial(request, development) {
  const deny = (error, status = 403) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  if (development !== true) return deny("This demo's data routes are disabled outside local development. Real sign-in and permissions must be enabled before hosting it.", 503);
  const url = new URL(request.url);
  if (!["http:", "https:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return deny("Open the local demo address on this computer.");
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site)) return deny("Requests from another site cannot access this local demo.");
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== url.origin) return deny("Requests from another origin cannot access this local demo.");
  if (!["GET", "HEAD"].includes(request.method) && origin !== url.origin) return deny("Changes require a request from the local demo's own origin.");
  return null;
}
