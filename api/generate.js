// Vercel serverless function.
// Deploys automatically as POST https://<your-project>.vercel.app/api/generate
// Requires an ANTHROPIC_API_KEY environment variable set in the Vercel project settings.

module.exports = async (req, res) => {
  // CORS — restrict Access-Control-Allow-Origin to your real domain(s) before going to production.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server misconfigured: ANTHROPIC_API_KEY is not set" });
    return;
  }

  const prompt = `You are generating a compact graphical abstract for a research paper for an instrument-panel styled science website.

Title: ${title}
Abstract: ${abstract}

Return ONLY raw JSON (no markdown fences, no commentary) with this exact shape:
{"objective":"<max 12 words, the research question>","method":"<max 12 words, the approach>","finding":"<max 14 words, the key result>","svg":"<a complete standalone SVG string>"}

SVG requirements:
- viewBox="0 0 800 460", no width/height attributes on the root svg tag
- Background rect fill="#0f1620" covering the full viewBox
- Use ONLY these colors for strokes/fills/text: #2dd4bf, #fbbf24, #dbe4ec, #64748b, #22303f
- Depict a left-to-right 3-stage flow: OBJECTIVE -> METHOD -> FINDING, using simple geometric shapes only (circles, rects, lines, polygons for arrows). No embedded images, no external fonts, no <image> tags.
- Include short <text> labels (font-family="monospace", font-size 12-16) summarizing each stage in a few words.
- Keep total element count modest (roughly 15-25 elements).
- Make it visually specific to the actual science in the abstract, not a generic template shape, where possible reflect the domain (e.g. a wave, a molecule, a circuit, a vehicle, a cell) using simple primitives.

Output only the JSON object, nothing else.`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Check https://docs.claude.com for the current recommended model string
        // before going live — this changes over time.
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(502).json({ error: `Anthropic API error: ${errText}` });
      return;
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      res.status(502).json({ error: "No text content returned by model" });
      return;
    }

    let clean = textBlock.text.trim();
    clean = clean
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    const parsed = JSON.parse(clean);
    if (!parsed.svg) {
      res.status(502).json({ error: "Model response did not include an svg field" });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unknown server error" });
  }
};
