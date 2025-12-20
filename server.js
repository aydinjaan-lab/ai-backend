import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: true }));

/* ================= CONFIG ================= */
const API_KEY = process.env.MISTRAL_API_KEY;
let ADMIN_SECRET = "BtA43gjewaAD4g";

const USER_LIMIT = 10;
const BAN_TIME = 24 * 60 * 60 * 1000;

let messageCountByIP = {};
let bannedIPs = {};

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send("AI backend is running (Mistral)");
});

/* ================= AI FUNCTION ================= */
async function askAI(question) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify({
          model: "mistral-small",
          messages: [{ role: "user", content: question }],
          max_tokens: 200
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
?cmd=stats
?cmd=bans
?cmd=reset
?cmd=unban
?cmd=test
?cmd=setadmin&new=NEWCODE

--------------------------------
`;
}

function listBans() {
  const now = Date.now();
  const ips = Object.keys(bannedIPs);
  if (ips.length === 0) return "No IPs are currently banned.";

  let out = "BANNED IP LIST:\n";
  ips.forEach(ip => {
    const h = Math.ceil((bannedIPs[ip] - now) / 3600000);
    out += `- ${ip} (~${h}h left)\n`;
  });
  return out;
}

/* ================= ASK ================= */
app.get("/ask", async (req, res) => {
  res.set("Content-Type", "text/plain");

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0] ||
    req.socket.remoteAddress;

  const q = req.query.q || "";
  const admin = req.query.admin || "";
  const cmd = req.query.cmd || "";
  const newAdmin = req.query.new || "";

  const isAdmin = admin === ADMIN_SECRET;

  /* Admin commands */
  if (isAdmin && cmd) {
    if (cmd === "stats")
      return res.send(adminPanel() +
        `IPs: ${Object.keys(messageCountByIP).length}\nBanned: ${Object.keys(bannedIPs).length}`);

    if (cmd === "bans")
      return res.send(adminPanel() + listBans());

    if (cmd === "reset") {
      messageCountByIP = {};
      bannedIPs = {};
      return res.send(adminPanel() + "All counters reset.");
    }

    if (cmd === "unban") {
      bannedIPs = {};
      return res.send(adminPanel() + "All bans cleared.");
    }

    if (cmd === "test") {
      const a = await askAI("Say hello briefly");
      return res.send(adminPanel() + "AI Test:\n" + a);
    }

    if (cmd === "setadmin" && newAdmin.length >= 3) {
      ADMIN_SECRET = newAdmin;
      return res.send(adminPanel() + "Admin code updated.");
    }

    return res.send(adminPanel());
  }

  if (!q.trim()) {
    if (isAdmin) return res.send(adminPanel());
    return res.send("Please enter a question.");
  }

  if (bannedIPs[ip] && bannedIPs[ip] > Date.now())
    return res.send("You are banned for 24 hours.");

  if (!isAdmin) {
    messageCountByIP[ip] = (messageCountByIP[ip] || 0) + 1;
    if (messageCountByIP[ip] > USER_LIMIT) {
      bannedIPs[ip] = Date.now() + BAN_TIME;
      return res.send("Limit exceeded. You are banned for 24 hours.");
    }
  }

  res.send(await askAI(q));
});

/* ================= START ================= */
app.listen(3000);
