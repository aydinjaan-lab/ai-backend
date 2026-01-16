import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MISTRAL_API_KEY;

/* Health / wake endpoint */
app.get("/ping", (req, res) => {
  res.type("text").send("OK");
});

/* Main AI endpoint */
app.get("/ask", async (req, res) => {
  res.type("text");

  const q = (req.query.q || "").toString().trim();

  if (!q) {
    res.send("");
    return;
  }

  if (!API_KEY) {
    res.send("");
    return;
  }

  try {
    const response = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mistral-small",
          messages: [
            { role: "system", content: "Reply briefly in simple English. No symbols." },
            { role: "user", content: q }
          ],
          max_tokens: 50,
          temperature: 0.6
        })
      }
    );

    if (!response.ok) {
      res.send("");
      return;
    }

    const data = await response.json();

    let text = "";
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      text = data.choices[0].message.content;
    }

    /* Strip non-ASCII characters (important for Nokia) */
    text = text.replace(/[^\x00-\x7F]/g, "");

    res.send(text);

  } catch (err) {
    res.send("");
  }
});

/* Start server */
app.listen(PORT, () => {
  console.log("AI backend running");
});