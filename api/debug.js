const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ error: "GEMINI_API_KEY not set" });

  const keyPreview = `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hi in one word");
    const text = result.response.text();

    return res.status(200).json({
      keyPreview,
      status: "SUCCESS",
      response: text,
    });
  } catch (err) {
    return res.status(200).json({
      keyPreview,
      status: "ERROR",
      errorMessage: err.message,
      errorDetails: err.errorDetails || null,
    });
  }
};
