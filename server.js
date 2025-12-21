import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.MISTRAL_API_KEY;

app.get("/ask", async (req, res) => {
  const q = req.query.q || "";

  if (!q) {
    res.send("No question.");
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
        messages: [{ role: "user", content: q }],
        max_tokens: 200
      })
    });

    const j = await r.json();
    res.send(j.choices[0].message.content);
  } catch {
    res.send("AI busy.");
  }
});

app.listen(PORT, () => {
  console.log("AI backend running");
});
