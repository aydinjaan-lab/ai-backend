import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.DEEPSEEK_KEY;

app.post("/ask", async (req, res) => {
  const question = req.body.q || "";

  const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: question }]
    })
  });

  const j = await r.json();
  const answer = j.choices?.[0]?.message?.content || "No reply";

  res.send(answer);
});

app.listen(3000);
