export async function readJsonResponse(response, options = {}) {
  const fallback = options.fallback ?? "The server returned an unexpected response.";
  const tooLarge = options.tooLarge ?? fallback;
  const body = await response.text();

  if (response.status === 413) throw new Error(tooLarge);

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(fallback);
  }
}
