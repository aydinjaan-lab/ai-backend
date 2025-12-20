import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

/* ================= CONFIG ================= */
const API_KEY = process.env.DEEPSEEK_KEY;

/* CHANGE THIS ADMIN CODE */
const ADMIN_SECRET = "BtA43gjewaAD4g";

/* Message counter (free-tier memory) */
let messageCount = 0;
const USER_LIMIT = 10;

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("AI backend is running");
});

/* ================= AI FUNCTION ================= */
async function askAI(question) {
  for (let attempt = 0; attempt < 2; attempt++) {
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
      if (!text) continue;

      const j = JSON.parse(text);
      if (j.choices && j.choices[0] && j.choices[0].message) {
        return j.choices[0].message.content;
      }
    } catch (e) {
      // retry once
    }
  }

  return "AI is busy. Try again in a minute.";
}

/* ================= ASK ENDPOINT ================= */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const question = req.query.q || "";
  const adminCode = req.query.admin || "";

  if (question.trim() === "") {
    res.send("Please enter a question.");
    return;
  }

  /* ADMIN BYPASS */
  const isAdmin = adminCode === ADMIN_SECRET;

  if (!isAdmin) {
    messageCount++;

    if (messageCount > USER_LIMIT) {
      res.send(
        "Message limit reached (10). Admin access required for more."
      );
      return;
    }
  }

  const answer = await askAI(question);
  res.send(answer);
});

/* ================= START ================= */
app.listen(3000);
