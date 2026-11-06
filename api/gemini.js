// Vercel serverless function: proxies One Place photo-AI calls to Google Gemini.
//
// The Gemini API key lives ONLY in the Vercel GEMINI_API_KEY environment variable
// (Project -> Settings -> Environment Variables). It is never in this file, never
// in the page, and never logged. The page calls POST /api/gemini with
// { model, contents, generationConfig } and gets Gemini's generateContent
// response back.
//
// Only signed-in people can use it: the page sends its Supabase sign-in token in
// the Authorization header, and we check that token with Supabase before spending
// any of the Gemini quota. (The Supabase URL and publishable key below are public
// by design.)

var ALLOWED_MODEL = /^gemini-[a-z0-9.-]+$/i;
var SUPABASE_URL = "https://ykqnjpgbdwrenilwxkio.supabase.co";
var SUPABASE_KEY = "sb_publishable_1TrviuurElOjjrQRY56oUg_yzgNwHiR";

async function isSignedIn(authHeader) {
  if (typeof authHeader !== "string" || authHeader.slice(0, 7).toLowerCase() !== "bearer ") return false;
  try {
    var r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_KEY, Authorization: authHeader },
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!(await isSignedIn(req.headers.authorization))) {
    return res.status(401).json({ error: "Please sign in again to use the photo AI." });
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
