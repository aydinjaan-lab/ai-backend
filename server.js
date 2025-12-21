import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.MISTRAL_API_KEY;

/* Basic health check */
app.get("/", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("AI backend running");
});

/* AI endpoint */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const q = (req.query.q || "").toString().trim();

  if (!q) {
    res.send("No question provided.");
    return;
  }

  if (!KEY) {
    res.send("AI key missing.");
    return;
  }

  try {
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [
          { role: "system", content: "Reply in plain simple English. No symbols." },
          { role: "user", content: q }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!r.ok) {
      res.send("AI service error.");
      return;
    }

    const j = await r.json();
    let text = j.choices?.[0]?.message?.content || "No response.";

    /* Strip all non-ASCII characters (VERY IMPORTANT FOR NOKIA) */
    text = text.replace(/[^\x00-\x7F]/g, "");

    /* Prevent empty response */
    if (!text.trim()) {
      text = "AI returned an empty reply.";
    }

    res.send(text);

  } catch (err) {
    res.send("AI busy.");
  }
});

/* Start server */
app.listen(PORT, () => {
  console.log("AI backend running");
});
