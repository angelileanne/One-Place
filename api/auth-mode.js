// Vercel serverless function: lets the owner turn "Confirm email" on or off for
// One Place sign-ups while testing, without opening the Supabase dashboard.
//
// Secrets live ONLY in Vercel environment variables, never in this file or the page:
//   SUPABASE_ACCESS_TOKEN  a Supabase access token (Account -> Access Tokens)
//   OWNER_EMAIL            the one email allowed to use this tool
// Everyone else gets a 403, so a random visitor can never flip the setting.

var PROJECT_REF = "ykqnjpgbdwrenilwxkio";
var SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
var SUPABASE_KEY = "sb_publishable_1TrviuurElOjjrQRY56oUg_yzgNwHiR";
var CONFIG_URL = "https://api.supabase.com/v1/projects/" + PROJECT_REF + "/config/auth";

async function signedInEmail(authHeader) {
  if (typeof authHeader !== "string" || authHeader.slice(0, 7).toLowerCase() !== "bearer ") return null;
  try {
    var r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_KEY, Authorization: authHeader },
    });
    if (!r.ok) return null;
    var u = await r.json();
    return u && typeof u.email === "string" ? u.email.toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  var token = process.env.SUPABASE_ACCESS_TOKEN;
  var owner = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!token || !owner) {
    return res.status(501).json({ error: "Not set up yet. Add SUPABASE_ACCESS_TOKEN and OWNER_EMAIL in Vercel, then redeploy." });
  }

  var email = await signedInEmail(req.headers.authorization);
  if (!email) return res.status(401).json({ error: "Please sign in on the app first." });
  if (email !== owner) return res.status(403).json({ error: "This tool is only for the owner." });

  var headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  try {
    if (req.method === "POST") {
      var body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (!body || typeof body.confirmEmail !== "boolean") {
        return res.status(400).json({ error: "Send { confirmEmail: true or false }." });
      }
      var patch = await fetch(CONFIG_URL, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ mailer_autoconfirm: !body.confirmEmail }),
      });
      if (!patch.ok) {
        return res.status(502).json({ error: "Supabase said no (" + patch.status + "). The access token may be wrong or missing permission to edit auth settings." });
      }
    } else if (req.method !== "GET") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    var cfg = await fetch(CONFIG_URL, { headers: headers });
    if (!cfg.ok) {
      return res.status(502).json({ error: "Couldn't read the setting (" + cfg.status + "). Check the access token." });
    }
    var data = await cfg.json();
    return res.status(200).json({ confirmEmail: data.mailer_autoconfirm !== true });
  } catch (e) {
    return res.status(502).json({ error: "Couldn't reach Supabase. Try again." });
  }
};
