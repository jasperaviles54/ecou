module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(200).json({ error: "GROQ_API_KEY not set" });

  const keyPreview = `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say hi in one word" }],
        max_tokens: 10,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(200).json({
        keyPreview,
        status: "ERROR",
        httpStatus: groqRes.status,
        error: data,
      });
    }

    return res.status(200).json({
      keyPreview,
      status: "SUCCESS",
      response: data.choices?.[0]?.message?.content,
    });
  } catch (err) {
    return res.status(200).json({
      keyPreview,
      status: "ERROR",
      errorMessage: err.message,
    });
  }
};
