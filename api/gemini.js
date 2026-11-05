// Vercel serverless function: proxies One Place photo-AI calls to Google Gemini.
//
// The Gemini API key lives ONLY in the Vercel GEMINI_API_KEY environment variable
// (Project -> Settings -> Environment Variables). It is never in this file, never
// in the page, and never logged. The page calls POST /api/gemini with
// { model, contents, generationConfig } and gets Gemini's generateContent
// response back. Deploy by placing this file at api/gemini.js in the repo;
// Vercel serves it at /api/gemini on the same domain as the page.

var ALLOWED_MODEL = /^gemini-[a-z0-9.-]+$/i;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  var key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Photo AI is not set up yet." });
  }

  var body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Bad request" });
    }
  }
  body = body || {};
  var model = body.model;
  var contents = body.contents;
  var generationConfig = body.generationConfig;

  if (typeof model !== "string" || !ALLOWED_MODEL.test(model)) {
    return res.status(400).json({ error: "Bad model" });
  }
  if (!Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: "No images or prompt supplied" });
  }

  var url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";

  try {
    var upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: contents, generationConfig: generationConfig }),
    });
    var data = await upstream.json().catch(function () {
      return null;
    });
    if (!upstream.ok) {
      var message =
        (data && data.error && data.error.message) ||
        "Gemini returned " + upstream.status;
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: message });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Could not reach Gemini. Please try again." });
  }
};
