module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ error: "GEMINI_API_KEY not set" });

  const model = "gemini-2.0-flash-lite";
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "Say hi in one word" }] }],
    generationConfig: { maxOutputTokens: 10 },
  });

  const methods = {
    "query_param": {
      url: `${baseUrl}?key=${key}`,
      headers: { "Content-Type": "application/json" },
    },
    "x-goog-api-key": {
      url: baseUrl,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    },
    "bearer": {
      url: baseUrl,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    },
  };

  const results = {};
  for (const [name, config] of Object.entries(methods)) {
    try {
      const r = await fetch(config.url, {
        method: "POST",
        headers: config.headers,
        body,
      });
      const text = await r.text();
      results[name] = { status: r.status, body: text.substring(0, 200) };
    } catch (err) {
      results[name] = { status: "error", body: err.message };
    }
  }

  return res.status(200).json({
    keyPreview: `${key.substring(0, 5)}...${key.substring(key.length - 4)}`,
    model,
    results,
  });
};
