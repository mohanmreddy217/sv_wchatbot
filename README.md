# SV Developers WhatsApp Bot (whatsapp-web.js + Google Sheets)

Free: no Meta API, no payment method, no paid AI. Replies from the website content, saves every message and lead to a Google Sheet, and keeps a local backup.

## Before you start
- Install **Node.js 20 LTS or newer** (nodejs.org). Check with `node --version`.
- Use a **spare SIM / number you can afford to lose.** whatsapp-web.js is unofficial, so WhatsApp can restrict or ban the number. Keep risk low: the bot only replies to people who message first, never send broadcasts or messages to people who didn't contact you, and don't use a brand-new number on day one.
- The phone with that number must stay with you and be opened on WhatsApp every few days, otherwise the linked session may log out.

## 1. Google Sheet (free)
1. Create a new Google Sheet named "SV Developers Bot".
2. **Extensions -> Apps Script**. Delete the sample code, paste in everything from `apps_script.gs`.
3. Change `SECRET` to a long random text (like a password). Save.
4. Click **Deploy -> New deployment -> Select type (gear) -> Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy, approve the permissions (Advanced -> Go to project), and copy the **Web app URL** (ends with `/exec`).
6. If you ever edit the script later, use Deploy -> Manage deployments -> edit -> New version, or the old code keeps running.

The bot creates two tabs automatically: **Messages** (every incoming/outgoing message) and **Leads** (site visit requests and callback requests, with a Status column you can fill in).

## 2. Run the bot
```
npm install            (downloads Chromium too, ~200 MB, one time)
copy .env.example .env     (Windows)   |   cp .env.example .env  (Mac/Linux)
```
The file must be named exactly `.env` (with the dot), not `_env`.
```
```
Edit `.env`: paste `SHEET_URL`, the same `SHEET_SECRET` as in the script, the real project links (`LINK_...`), `MEDIA_URL`, and (optional) `OWNER_NUMBER`.

**Before starting the bot, test the Sheet connection:** `npm run check-sheet`

```
node bot.js
```
A QR code appears. On the spare phone: WhatsApp -> Settings -> **Linked devices** -> **Link a device** -> scan it. When you see "bot is ready", message the number from another phone and say "hi".

The login is saved in `.wwebjs_auth/`, so you only scan once. Keep that folder private.

## Where your data is
- Google Sheet: tabs Messages and Leads.
- Local backup: `data/conversations.jsonl` and `data/leads.jsonl`. If Google is unreachable, the bot retries 5 times; anything it couldn't send is still in these files.
- With `OWNER_NUMBER` set, the bot also sends you a WhatsApp alert for every new lead.

## How it answers
Customers just type normal questions, no menus or numbers. The bot spots the project (Sri Nivasam, Sri City, Sri Vanam, Siri Vanam, SV Apartment) and what they want to know (price, approvals, location, size, amenities, nearby places, loan, registration, offer, careers, site visit) and replies with only that. It remembers the project being discussed, so "what is the price?" or "is it approved?" right after "tell me about Siri Vanam" refers to Siri Vanam. It also understands some Telugu/Hindi words typed in English letters (e.g. "price entha", "ekkada").

Site visit: "I want to visit Sri City" starts a short booking (name, project, date/time). Questions asked in the middle are still answered, then the bot gently returns to the booking.

Optional free AI fallback: for questions the rules can't match (for example "is there a good school near Shamirpet?"), set `GEMINI_API_KEY` in `.env` (free key from aistudio.google.com). It answers only from your website content and is capped by `LLM_MAX_PER_MIN`. Notes: the free tier is rate-limited, Google may use free-tier data to improve its products (customer messages would be sent to Google), and model names change, so update `GEMINI_MODEL` if Google retires it. Leave the key empty to keep everything local.

## Updating answers
Edit the CONTENT section at the top of `bot.js` (BIZ, PROJECTS facts, GENERAL) and restart the bot.
To hide the Diwali offer, set `OFFER_TEXT=` (empty) in `.env`.

## Keeping it online
The bot only works while `node bot.js` is running on a computer that's on and online. For 24/7 you need an always-on machine (an old laptop or PC, or a free-tier server if you can get one).

## Troubleshooting
- No QR / Chromium error: re-run `npm install`; on Linux servers install the Chromium dependencies.
- "Disconnected" in the log: restart `node bot.js`; if it asks for a QR again, delete `.wwebjs_auth` and re-link.
- Nothing in the Sheet: check the bot log for "Sheet log failed". Usually the URL is wrong, the deployment access isn't "Anyone", or `SHEET_SECRET` doesn't match the script.


## Number menus, budget suggestions and links (v6)
- Reply **menu** (or **0**) for the main menu: 1-5 = projects, 6 = find a project for my budget, 7 = book a FREE site visit, 8 = call back, 9 = photos & videos, 10 = office & contact.
- After a project is opened, its own menu appears: 1 price, 2 location, 3 approvals, 4 size, 5 amenities, 6 loan & registration, 7 book visit, 8 team, 9 photos & videos, 0 main menu.
- When a customer types or says a budget ("my budget is 20 lakhs", "25-30 lakhs", "1 crore", "20L") or picks a budget band (menu 6), the bot suggests the best-matching projects from the price ranges in `PROJECT_EXTRA` in `bot.js`.
- Every project answer ends with the project link, the phone number for more details, and an invitation to book a FREE site visit.
- Photos/videos requests get the website link (`MEDIA_URL`, or `MEDIA_<PROJECT>` per project).
- Change prices/highlights in `PROJECT_EXTRA` (prices are in lakhs).

## Google Sheet not updating? Checklist
Run `npm run check-sheet` first. It prints exactly which step fails. Manual checks:
1. The file is named `.env`, not `_env`. The bot's first log line says `.env found: yes`.
2. Open the `/exec` URL in a private window: you should see JSON with `"ok":true`. The JSON also shows the **spreadsheet name and link** that the script writes to. Make sure that is the sheet you are looking at.
3. On start the bot writes a row `SYSTEM | Bot started (connection test)` to the Messages tab. Look for it (tabs Messages, Leads, Customers are created automatically, so scroll the tab list).
4. The bot log shows `saved to Google Sheet -> Messages (row N) in "Sheet name"` for every message. `Sheet log failed` means an error: the text after it says why.
5. After editing the script you must do Deploy -> Manage deployments -> pencil -> Version: **New version** -> Deploy. Saving alone does not update the live web app.
6. `SHEET_SECRET` in `.env` and `SECRET` in the script must be identical.
7. If the script was created from script.google.com (not from the sheet's Extensions -> Apps Script), put the sheet ID in `SHEET_ID` inside the script.
