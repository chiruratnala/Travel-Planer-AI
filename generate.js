// Netlify Function: proxies requests to Gemini so the API key never reaches the browser.
// Set GEMINI_API_KEY in Netlify > Site configuration > Environment variables.

// gemini-3.5-flash-lite is Google's fastest 3.x model, which suits Netlify's 10s function limit.
// You can override it without editing code by setting GEMINI_MODEL in Netlify env variables.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const MAX_BODY_BYTES = 20000; // reject oversized prompts

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: { message: "Method not allowed" } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, { error: { message: "Server is missing GEMINI_API_KEY." } });
  }

  // Basic abuse protection: only accept requests from your own site.
  // Netlify sets URL to your site's primary URL; add your custom domain(s) if needed.
  const origin = event.headers.origin || "";
  const allowed = [process.env.URL, process.env.DEPLOY_PRIME_URL, "http://localhost:8888"].filter(Boolean);
  if (origin && !allowed.includes(origin)) {
    return json(403, { error: { message: "Origin not allowed" } });
  }

  if (!event.body || Buffer.byteLength(event.body) > MAX_BODY_BYTES) {
    return json(413, { error: { message: "Request too large" } });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return json(400, { error: { message: "Invalid JSON" } });
  }

  // Forward only the fields we expect.
  const payload = {
    contents: body.contents,
    generationConfig: body.generationConfig,
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(payload),
      }
    );
    const text = await upstream.text();
    if (!upstream.ok) console.error("Gemini error", upstream.status, text.slice(0, 500));
    return { statusCode: upstream.status, headers: { "Content-Type": "application/json" }, body: text };
  } catch (err) {
    console.error("Upstream fetch failed:", err);
    return json(502, { error: { message: "Upstream request failed: " + err.message } });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}