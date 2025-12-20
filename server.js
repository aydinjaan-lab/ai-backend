import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

/* ================= CONFIG ================= */
const API_KEY = process.env.DEEPSEEK_KEY;

/* CHANGE THIS ADMIN CODE */
const ADMIN_SECRET = "BtA43gjewaAD4g";

/* Limits */
const USER_LIMIT = 10;
const BAN_TIME = 24 * 60 * 60 * 1000; // 24 hours

/* In-memory storage (Render free tier) */
let messageCountByIP = {};
let bannedIPs = {};

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

  return "AI is busy. Try again later.";
}

/* ================= ASK ENDPOINT ================= */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const question = req.query.q || "";
  const adminCode = req.query.admin || "";

  /* Empty question */
  if (question.trim() === "") {
    res.send("Please enter a question.");
    return;
  }

  /* Check ban */
  if (bannedIPs[ip]) {
    const remaining = bannedIPs[ip] - Date.now();
    if (remaining > 0) {
      res.send("You are banned for 24 hours due to exceeding the limit.");
      return;
    } else {
      delete bannedIPs[ip];
      delete messageCountByIP[ip];
    }
  }

  /* Admin bypass */
  const isAdmin = adminCode === ADMIN_SECRET;

  if (!isAdmin) {
    if (!messageCountByIP[ip]) {
      messageCountByIP[ip] = 0;
    }

    messageCountByIP[ip]++;

    if (messageCountByIP[ip] > USER_LIMIT) {
      bannedIPs[ip] = Date.now() + BAN_TIME;
      res.send(
        "Limit exceeded. You are banned for 24 hours."
      );
      return;
    }
  }

  const answer = await askAI(question);
  res.send(answer);
});

/* ================= START ================= */
app.listen(3000);
