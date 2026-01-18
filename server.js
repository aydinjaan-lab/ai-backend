import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.MISTRAL_API_KEY;

/* --------------------
   Wake / Health Check
-------------------- */
app.get("/ping", (req, res) => {
  res.type("text").send("OK");
});

/* --------------------
   Start Page
-------------------- */
app.get("/ai", (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nokia AI</title>
</head>
<body>
  <h3>Nokia AI</h3>

  <form method="GET" action="/ask">
    <input type="text" name="q" style="width:90%;" />
    <br><br>
    <input type="submit" value="Ask">
  </form>

  <p>
    Tips:<br>
    - Ask clear questions<br>
    - Use follow-ups for more detail
  </p>
</body>
</html>
  `);
});

/* --------------------
   Ask + Reply Page
-------------------- */
app.get("/ask", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  res.type("html");

  if (!q) {
    res.send("No question provided.<br><a href='/ai'>Back</a>");
    return;
  }

  if (!API_KEY) {
    res.send("AI key not set.");
    return;
  }

  let answer = "AI is busy. Try again.";

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
            {
              role: "system",
              content: "Reply in proper, clear English with detailed explanations when appropriate.
You may use normal punctuation symbols such as . , ? ! : ; ( ) - and quotes.
Do NOT use emojis or Unicode emoji characters.
If an emotional expression is needed, use ASCII text emoticons like :) :( ;) :D :O instead of emojis.
Avoid special symbols that are not standard keyboard characters.

If your reply would exceed 225 words, stop at a natural point and tell the user to continue the dialogue by typing the word "continue"."
            },
            {
              role: "user",
              content: q
            }
          ],
          max_tokens: 225,
          temperature: 0.6
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content
      ) {
        answer = data.choices[0].message.content;
      }
    }
  } catch (e) {}

  /* Remove non-ASCII characters (Nokia-safe) */
  answer = answer.replace(/[^\x00-\x7F]/g, "");

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nokia AI</title>
</head>
<body>
  <h3>You asked:</h3>
  <p>${escapeHtml(q)}</p>

  <h3>AI replied:</h3>
  <p>${escapeHtml(answer)}</p>

  <hr>

  <form method="GET" action="/ask">
    <input type="text" name="q" style="width:90%;" />
    <br><br>
    <input type="submit" value="Reply">
  </form>

  <p>
    <a href="/ai">New chat</a>
  </p>
</body>
</html>
  `);
});

/* --------------------
   Simple HTML escape
-------------------- */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* --------------------
   Start Server
-------------------- */
app.listen(PORT, () => {
  console.log("AI backend running");
});
