// Vercel serverless function: POST /api/generate
// Calls OpenRouter server-side so the API key never reaches the browser.
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   OPENROUTER_API_KEY  (required)  your OpenRouter key
//   OPENROUTER_MODEL    (optional)  defaults to "openai/gpt-4o"
//   SITE_URL            (optional)  sent as HTTP-Referer, e.g. https://yourname.github.io
//   SITE_NAME           (optional)  sent as X-Title
//   ALLOWED_ORIGINS     (recommended) comma-separated exact origins, e.g.
//                       https://kvamshikrishna.netlify.app,https://kudurupaka-vamshi-krishna.github.io,https://<project>.vercel.app
//                       (defaults to "*" if unset)

module.exports = async (req, res) => {
  // Comma-separated list of exact origins (scheme + host, no path, no trailing slash).
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const reqOrigin = req.headers.origin;
  const wildcard = allowed.includes("*");

  if (wildcard) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (reqOrigin && allowed.includes(reqOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", reqOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Raises the bar against other sites using your credits (not a substitute for real auth:
  // a script can spoof the Origin header).
  if (!wildcard && (!reqOrigin || !allowed.includes(reqOrigin))) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { title, abstract } = req.body || {};
  if (!title || !abstract) {
    res.status(400).json({ error: "title and abstract are required" });
    return;
  }
  if (String(abstract).length > 6000) {
    res.status(400).json({ error: "abstract is too long (max 6000 characters)" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server misconfigured: OPENROUTER_API_KEY is not set" });
    return;
  }

  const prompt = `You are generating a compact graphical abstract for a research paper.

Title: ${title}
Abstract: ${abstract}

Return ONLY a JSON object with exactly this shape:
{"objective":"<max 12 words, the research question>","method":"<max 12 words, the approach>","finding":"<max 14 words, the key result>","svg":"<a complete standalone SVG string>"}

SVG requirements:
- viewBox="0 0 800 460", no width/height attributes on the root svg tag
- Background rect fill="#f8fafc" covering the full viewBox
- Use ONLY these colors for strokes/fills/text: #2563eb, #f59e0b, #10b981, #0f172a, #64748b, #e2e8f0
- Depict a left-to-right 3-stage flow: OBJECTIVE -> METHOD -> FINDING, using simple geometric shapes only (circles, rects, lines, polygons for arrows). No <image> tags, no external fonts, no scripts.
- Include short <text> labels (font-family="sans-serif", font-size 13-16) summarizing each stage in a few words, placed so they do not overlap.
- Keep the element count modest (roughly 15-25 elements).
- Make the drawing specific to the science in the abstract (e.g. a vehicle, pedestrian, wave, circuit, cell) using simple primitives, not a generic template.

Output only the JSON object.`;

  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.SITE_URL || "https://example.com",
        "X-Title": process.env.SITE_NAME || "Graphical Abstract Generator",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1800,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      res.status(502).json({ error: `OpenRouter error (${orRes.status}): ${errText}` });
      return;
    }

    const data = await orRes.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;
    if (!content) {
      res.status(502).json({ error: "OpenRouter returned no content" });
      return;
    }

    const clean = content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      res.status(502).json({ error: "Model did not return valid JSON. Try Regenerate." });
      return;
    }
    if (!parsed.svg || typeof parsed.svg !== "string" || !parsed.svg.trim().startsWith("<svg")) {
      res.status(502).json({ error: "Model response did not include a valid svg field" });
      return;
    }

    // Defensive: strip scripts and inline event handlers before the browser injects this SVG.
    parsed.svg = parsed.svg
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "");

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error" });
  }
};
