import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.DEEPSEEK_KEY;

app.get("/", (req, res) => {
  res.send("AI backend is running.");
});

async function askAI(question) {
  try {
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

    if (!j || !j.choices || !j.choices[0]) {
      return "AI is busy or unavailable. Try again.";
    }

    return j.choices[0].message.content;

  } catch (e) {
    return "Connection error. Try again later.";
  }
}

/* GET is Nokia-safe */
app.get("/ask", async (req, res) => {
  const question = req.query.q || "";

  if (question.trim() === "") {
    res.send("Please enter a question.");
    return;
  }

  const answer = await askAI(question);
  res.send(answer);
});

app.listen(3000);
