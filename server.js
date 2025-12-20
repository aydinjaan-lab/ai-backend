import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

/* ================= CONFIG ================= */
const API_KEY = process.env.DEEPSEEK_KEY;

/* Admin code (can be changed at runtime) */
let ADMIN_SECRET = "BtA43gjewaAD4g";

/* Limits */
const USER_LIMIT = 10;
const BAN_TIME = 24 * 60 * 60 * 1000;

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
    } catch (e) {}
  }
  return "AI is busy. Try again later.";
}

/* ================= ADMIN PANEL ================= */
function adminPanel() {
  return `
ADMIN COMMAND PANEL

Commands:
?cmd=stats        → show usage stats
?cmd=bans         → show banned IPs
?cmd=reset        → reset counters & bans
?cmd=unban        → clear all bans
?cmd=test         → test AI
?cmd=setadmin&new=NEWCODE → change admin code

Examples:
 /ask?admin=ADMIN&cmd=stats
 /ask?admin=ADMIN&cmd=bans
 /ask?admin=ADMIN&cmd=setadmin&new=secret987

--------------------------------
`;
}

/* ================= FORMAT BANS ================= */
function listBans() {
  const now = Date.now();
  const ips = Object.keys(bannedIPs);

  if (ips.length === 0) return "No IPs are currently banned.";

  let out = "BANNED IP LIST:\n";
  ips.forEach(ip => {
    const remainingMs = bannedIPs[ip] - now;
    const hours = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
    out += `- ${ip} (expires in ~${hours}h)\n`;
  });
  return out;
}

/* ================= ASK ENDPOINT ================= */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0] ||
    req.socket.remoteAddress;

  const question = req.query.q || "";
  const adminCode = req.query.admin || "";
  const cmd = req.query.cmd || "";
  const newAdmin = req.query.new || "";

  const isAdmin = adminCode === ADMIN_SECRET;

  /* ================= ADMIN COMMAND MODE ================= */
  if (isAdmin && cmd) {

    if (cmd === "stats") {
      res.send(
        adminPanel() +
        "Active IPs: " + Object.keys(messageCountByIP).length +
        "\nBanned IPs: " + Object.keys(bannedIPs).length
      );
      return;
    }

    if (cmd === "bans") {
      res.send(adminPanel() + listBans());
      return;
    }

    if (cmd === "reset") {
      messageCountByIP = {};
      bannedIPs = {};
      res.send(adminPanel() + "All counters and bans reset.");
      return;
    }

    if (cmd === "unban") {
      bannedIPs = {};
      res.send(adminPanel() + "All IP bans cleared.");
      return;
    }

    if (cmd === "test") {
      const answer = await askAI("Say hello briefly");
      res.send(adminPanel() + "AI Test:\n" + answer);
      return;
    }

    if (cmd === "setadmin") {
      if (!newAdmin || newAdmin.length < 3) {
        res.send(adminPanel() + "New admin code must be at least 3 characters.");
        return;
      }
      ADMIN_SECRET = newAdmin;
      res.send(adminPanel() + "Admin code updated successfully.");
      return;
    }

    res.send(adminPanel() + "Unknown command.");
    return;
  }

  /* Show admin panel if admin code entered without question */
  if (isAdmin && question.trim() === "") {
    res.send(adminPanel());
    return;
  }

  /* Empty question */
  if (question.trim() === "") {
    res.send("Please enter a question.");
    return;
  }

  /* Ban check */
  if (bannedIPs[ip]) {
    if (bannedIPs[ip] > Date.now()) {
      res.send("You are banned for 24 hours due to exceeding the limit.");
      return;
    } else {
      delete bannedIPs[ip];
      delete messageCountByIP[ip];
    }
  }

  /* User limit */
  if (!isAdmin) {
    messageCountByIP[ip] = (messageCountByIP[ip] || 0) + 1;
    if (messageCountByIP[ip] > USER_LIMIT) {
      bannedIPs[ip] = Date.now() + BAN_TIME;
      res.send("Limit exceeded. You are banned for 24 hours.");
      return;
    }
  }

  const answer = await askAI(question);
  res.send(answer);
});

/* ================= START ================= */
app.listen(3000);
