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
   Simple AI Web Page
   (Nokia friendly)
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
    - Keep questions short<br>
    - If no reply, try again
  </p>
</body>
</html>
  `);
});

/* --------------------
   AI Endpoint
-------------------- */
app.get("/ask", async (req, res) => {
  res.type("text");

  const q = (req.query.q || "").toString().trim();

  if (!q) {
    res.send("No question provided.");
    return;
  }

  if (!API_KEY) {
    res.send("AI key not set.");
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
            {
              role: "system",
              content: "Reply briefly in simple English. No symbols."
            },
            {
              role: "user",
              content: q
            }
          ],
          max_tokens: 50,
          temperature: 0.6
        })
      }
    );

    if (!response.ok) {
      res.send("AI service error.");
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

    /* Remove non-ASCII characters (important for Nokia) */
    text = text.replace(/[^\x00-\x7F]/g, "");

    if (!text) {
      res.send("AI returned no response.");
      return;
    }

    res.send(text);

  } catch (err) {
    res.send("AI is busy. Try again.");
  }
});

/* --------------------
   Start Server
-------------------- */
app.listen(PORT, () => {
  console.log("AI backend running");
});