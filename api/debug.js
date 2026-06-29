module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.GEMINI_API_KEY;
  const keyPreview = key
    ? `${key.substring(0, 5)}...${key.substring(key.length - 4)} (${key.length} chars)`
    : "NOT SET";

  // Quick test: try calling Gemini with a minimal request
  let geminiStatus = "not tested";
  if (key) {
    try {
      const testRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );
      const body = await testRes.text();
      geminiStatus = `${testRes.status} — ${body.substring(0, 300)}`;
    } catch (err) {
      geminiStatus = `fetch error: ${err.message}`;
    }
  }

  return res.status(200).json({
    keyPresent: !!key,
    keyPreview,
    geminiStatus,
    nodeVersion: process.version,
  });
};
