const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async function handler(req, res) {
  /* ── CORS ─────────────────────────────────────────────────── */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  /* ── Validate input ───────────────────────────────────────── */
  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== "string")
    return res.status(400).json({ error: "Message is required" });

  /* ── API keys (supports key rotation like alumnihub) ──────── */
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ].filter(Boolean);

  if (keys.length === 0)
    return res.status(500).json({ error: "No Gemini API key configured" });

  /* ── System prompt ────────────────────────────────────────── */
  const systemPrompt = `You are EcoBot, the AI-powered Career Guidance Assistant for Eco University.

Your role is to:
- Provide career advice tailored to university students and recent graduates
- Help with resume writing, cover letters, and LinkedIn profiles
- Offer interview preparation tips, common questions, and the STAR method
- Answer FAQs about the university's Career Center services and resources
- Guide students on internship and job search strategies
- Assist with career path exploration across different fields and industries

Guidelines:
- Keep responses concise (2–3 paragraphs max) and well-structured
- Use bullet points or numbered lists when listing tips or steps
- Be friendly, encouraging, and professional
- If asked about topics completely unrelated to career guidance, education, or professional development, politely redirect: "That's outside my area of expertise, but I'd love to help with career-related questions! Try asking about resumes, interviews, or career paths."
- Do NOT provide legal, medical, or financial advice
- When uncertain, recommend the student visit the Career Center for personalized help`;

  /* ── Build chat history ───────────────────────────────────── */
  const chatHistory = [];
  for (const msg of history.slice(-10)) {
    chatHistory.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }

  /* ── Try each key + model (fallback like alumnihub) ───────── */
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
  let lastError;

  for (const modelName of MODELS) {
    for (const key of keys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
          history: chatHistory,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 512,
          },
        });

        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        return res.status(200).json({ reply });
      } catch (err) {
        lastError = err;
        const msg = (err.message ?? "").toLowerCase();
        const isTransient =
          msg.includes("quota") || msg.includes("rate") ||
          msg.includes("exhausted") || msg.includes("429") ||
          msg.includes("503") || msg.includes("unavailable") ||
          msg.includes("overloaded") || msg.includes("high demand") ||
          msg.includes("try again") || err.status === 429 || err.status === 503;
        if (!isTransient) throw err;
        // transient error → try next key/model
      }
    }
  }

  console.error("All keys/models exhausted:", lastError?.message);
  return res.status(502).json({
    error: "Failed to get a response from the AI",
    debug: { message: lastError?.message },
  });
};
