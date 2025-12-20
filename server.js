import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.DEEPSEEK_KEY;

/* Root check */
app.get("/", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("AI backend is running");
});

/* Helper */
async function askAI(question) {
  try {
    const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: question }]
      })
    });

    const text = await r.text();

    if (!text) {
      return "AI returned no data.";
    }

    const j = JSON.parse(text);

    if (!j.choices || !j.choices[0] || !j.choices[0].message) {
      return "AI is busy. Try again.";
    }

    return j.choices[0].message.content;

  } catch (e) {
    return "Connection error. Try again later.";
  }
}

/* Nokia-safe GET endpoint */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const question = req.query.q;
const adminCode = req.query.admin;

/* Admin secret */
const ADMIN_SECRET = "admin123";

/* Message limit */
if (adminCode !== ADMIN_SECRET) {
  if (!global.msgCount) global.msgCount = 0;
  global.msgCount++;

  if (global.msgCount > 10) {
    res.send("Message limit reached (10). Admin only beyond this.");
    return;
  }
}

  if (!question || question.trim() === "") {
    res.send("Please enter a question.");
    return;
  }

  const answer = await askAI(question);
  res.send(answer || "No answer returned.");
});

app.listen(3000);
