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

  /* ── Build Gemini request ─────────────────────────────────── */
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY)
    return res.status(500).json({ error: "Gemini API key not configured" });

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

  // Convert chat history to Gemini format
  const contents = [];
  for (const msg of history.slice(-10)) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errBody);
      return res.status(502).json({
        error: "Failed to get a response from the AI",
        debug: { status: geminiRes.status, body: errBody }
      });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response right now. Please try again.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
