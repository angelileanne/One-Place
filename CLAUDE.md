# One Place — handoff notes for Claude

Owner: Angeli (GitHub `angelileanne`, timezone America/Los_Angeles, mostly tests on iPhone).
One Place is her own app to keep her husband, family and friends organized: a home and business maintenance app that installs to the phone (PWA). It is live and real testers (her husband, friends, Kingshot game friends) are using it.

## Where everything lives
- **Repo:** `angelileanne/One-Place`. `main` is production. `phase-8-guest` is the older working branch.
- **Live:** https://one-place-three.vercel.app (Vercel auto-deploys every push to `main`).
- **Vercel:** project `oneplace`, id `prj_IjWnaH5r0UHnfyuTwW2SQiODP3AX`, team `team_TB82bY8IA10pMGh1EUgG4n5q`. Hobby plan: runtime logs are kept only 1 hour.
- **Supabase:** project `ykqnjpgbdwrenilwxkio` (`https://ykqnjpgbdwrenilwxkio.supabase.co`). The publishable key is in `index.html` (safe to ship). Never commit secret/service keys.
- **Env vars on Vercel:** the Gemini API key used by `api/gemini.js` (set in Vercel, never in the repo).

## How the app is built
- The whole app is one file: `index.html` (HTML + CSS + JS). No framework, no build step.
- Helpers: `h(tag, props, children)` builds DOM (false props are skipped, `true` becomes an empty attribute), `view(nodes)` swaps the screen, `rest(path, opts)` is the Supabase REST wrapper, `tx()` translates strings at runtime.
- `sw.js` is the service worker. `assets/` holds icons, manifest and Punchy images. `api/` holds the Vercel serverless functions.
- **Translations:** 11 languages (en, es, tl, zh, ja, ko, de, fr, tr, th, lo). Strings are looked up by the exact English text, so changing an English string breaks its translations. New strings go in a `dev/i18n/pNN.txt` file, one per line, 11 fields separated by `¦` (English first, then es, tl, zh, ja, ko, de, fr, tr, th, lo). Then run `python3 dev/build_i18n.py` from the repo root, which writes the dictionary into `index.html`.

## How to ship a change (Angeli expects this every time)
1. Edit `index.html` (and `api/` if needed).
2. Run the checks in `dev/tests/` (Playwright, see below).
3. Commit and push to `main`. Vercel deploys in under a minute.
4. Confirm the deployment is READY (Vercel MCP `list_deployments` / `get_deployment`).
5. **Send her the link** (https://one-place-three.vercel.app, plus where to tap, e.g. "More → Analytics"). She often checks from her phone.

## Standing rules from Angeli
- Keep final answers short and plain. She is not a developer.
- Always send the live/preview link when something is ready to test.
- Do NOT draw known brand characters or copy existing artwork. Punchy and the other characters are original.
- Photo AI only receives the country and currency, no other personal info.
- Do not add privacy notes or disclaimers about the usage tracking (her explicit instruction).
- Make big text fit on small phones. Check iPhone-sized screens, not just desktop.

## Photo AI ("Plan my fix", DIY guides, part drawings)
- Browser calls `callAIWith(model, parts, opts)` which posts to the Vercel function `api/gemini.js`.
- `api/gemini.js` verifies the Supabase login token, then calls Gemini `generateContent`. It sets thinking budget 0 (retries without it on a 400), aborts after 25 s, retries a 503 up to 2 times with a short wait, and logs "gemini timing" / "gemini final". `vercel.json` sets its `maxDuration` to 30.
- Models, tried in order: `AI_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-flash-latest"]`. `gemini-2.5-flash` is retired (404). `gemini-3.8-flash` has not been verified under real traffic, so check the model stats in Analytics.
- The Plan call has a 14 s client timeout. Speed and "photo AI is busy" errors were the biggest tester complaint, so watch the AI section of Analytics after any change here.
- DIY guide: `parseDiy` returns `keyParts`; `renderKeyParts` shows "Know your parts". Five parts have hand-drawn art in `PART_ART`; any other part is drawn by the AI as a schematic (`artPrompt`, `drawArtFor`, `cleanArt`), with a "See pictures" link.

## Other features worth knowing
- **Duplicate detection:** `normName` + `saveItem(f, fl, tasks)` ask before merging a same-named item and skip tasks that already exist.
- **Punchy (mascot) sizing:** `punchyBase()`, `punchyPlace()`, `textUnder(rect)`. He fits the phone tab bar and shrinks (CSS var `--psz`) when his bubble would cover text. Tested in `dev/tests/test81.js`.

## Usage tracking and the owner Analytics screen
- Table `public.app_events` (RLS: users can only insert their own rows; nobody can select directly). Events are `screen`, `step` and `ai` (with timing and ok/failed).
- Admin-only RPC `public.events_report()` (SECURITY DEFINER, only for users in `app_admins`) returns online now, AI stats by model, errors, step counts, screen dwell times, and the last 200 events with names. Other RPCs: `am_admin`, `analytics`, `log_visit`. `app_visits` stores daily visits.
- Client: `track`, `trackScreen`, and `showAnalytics()` (More → Analytics, owner only). "Happening now" and "Last 30 days" are collapsible by date/month; the live part refreshes every 15 s.
- Screens with no friendly name show as "Screen: <data-testid>"; adding names to the translation dictionary or `trackScreen` would make them nicer.
- There is a Sheets artifact "One Place Tester Analytics" and an hourly scheduled task (8:07–23:07 Pacific) that refreshes it. Its "Photo AI" and "Steps and screens" tabs still fill in on the next refresh.

## Testing
- Tests live in `dev/tests/` (Playwright with Chromium). They load the local `index.html` with fake data, so they do not touch real accounts. Run one with `node dev/tests/test51.js` from the repo root (Playwright must be installed; `npm i playwright` if missing).
  - `test51` and `test77`: home/desk layout and general regression.
  - `test79`: general flows. `test81`: Punchy fit on iPhone sizes. `test82`: duplicate items and tasks. `test83`: show/hide password eye.
- Always also click through the changed screen on a phone-sized viewport.

## Open to-dos
- Verify `gemini-3.8-flash` works in real use (check AI by model in Analytics).
- Improve screen labels so fewer events are unnamed.
- Update the Project docs (`claude/one-place-brief.md`) with: DIY drawings, Punchy fit, duplicate detection, tracking/analytics, the model list.
- Kingshot-friends invite message: waiting on Angeli to paste the original message she sent if she wants it edited.

## Gotchas
- Don't rename English UI strings casually (breaks translations).
- Hobby-plan Vercel logs vanish after an hour, so use the Analytics screen for history.
- `main` and `phase-8-guest` have different commit histories (main was squashed). Push to `main` by building on top of the remote `main`, don't force-push.
