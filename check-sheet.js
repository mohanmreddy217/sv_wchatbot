// Run:  npm run check-sheet      (or: node check-sheet.js)
// Tests every link between the bot and your Google Sheet and tells you exactly what is wrong.
const fs = require('fs');
for (const line of (fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '').split(/\r?\n/)) {
  const l = line.trim();
  if (!l || l.startsWith('#') || !l.includes('=')) continue;
  const i = l.indexOf('=');
  process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
const URL_ = process.env.SHEET_URL || '';
const SECRET = process.env.SHEET_SECRET || '';
let failed = 0;
const ok = (m) => console.log('  ✅', m);
const bad = (m, fix) => { failed++; console.log('  ❌', m); if (fix) console.log('     → FIX:', fix); };

async function call(method, body) {
  const res = await fetch(URL_, method === 'GET' ? {} : {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body),
  });
  const raw = await res.text();
  try { return { status: res.status, json: JSON.parse(raw) }; }
  catch (_) { return { status: res.status, raw: raw.replace(/\s+/g, ' ').slice(0, 100) }; }
}

(async () => {
  console.log('\n1) Local settings');
  if (fs.existsSync('.env')) ok('.env file found');
  else if (fs.existsSync('_env')) return bad('Found "_env" but the bot reads ".env" (with a dot)', 'Rename _env to .env');
  else return bad('No .env file in this folder', 'Copy .env.example to .env and fill it in');
  if (!URL_) return bad('SHEET_URL is empty in .env', 'Paste the Web app URL (ends with /exec)');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(URL_)) {
    bad('SHEET_URL does not look right: it must start with https://script.google.com/macros/s/ and end with /exec',
        /\/dev$/.test(URL_) ? 'You used the /dev test link. Use the /exec link from Deploy > Manage deployments.' : 'Copy the Web app URL again from Deploy > Manage deployments.');
  } else ok('SHEET_URL format looks right');
  if (!SECRET) bad('SHEET_SECRET is empty in .env', 'Put the same text you set as SECRET in the Apps Script'); else ok('SHEET_SECRET is set');
  if (failed) return;

  console.log('\n2) Is the web app reachable (no login page)?');
  let g;
  try { g = await call('GET'); } catch (e) { return bad('Could not reach Google: ' + e.message, 'Check your internet / firewall'); }
  if (!g.json) return bad(`Google returned a web page, not JSON (HTTP ${g.status}): "${g.raw}"`, 'Deploy > Manage deployments > Edit > "Who has access" = Anyone, then Deploy a New version');
  ok('Web app answered with JSON');

  console.log('\n3) Is the NEW script version deployed, and which spreadsheet is it attached to?');
  if (g.json.version) ok(`Script version: ${g.json.version}`);
  else bad('Old script version is deployed (no version field)', 'Paste the new apps_script.gs, then Deploy > Manage deployments > pencil icon > Version: New version > Deploy');
  if (g.json.spreadsheet) {
    if (/NOT CONNECTED/.test(g.json.spreadsheet)) bad(g.json.spreadsheet, 'Create the script from the sheet: Extensions > Apps Script, or paste the sheet ID into SHEET_ID');
    else {
      ok(`The script writes to the spreadsheet named: "${g.json.spreadsheet}"`);
      console.log(`     Open it: ${g.json.url}`);
      console.log('     ⚠ Make sure THIS is the sheet you are looking at. A copy with the same name will stay empty.');
    }
  }

  console.log('\n4) Does the secret match?');
  const w = await call('POST', { secret: SECRET + '_wrong', sheet: 'Messages', row: ['x'] });
  if (w.json && w.json.error === 'forbidden') ok('Script correctly rejects a wrong secret');
  else bad('Script did not reject a wrong secret: its code is not the one in apps_script.gs', 'Redeploy as a New version');
  const r = await call('POST', { secret: SECRET, sheet: 'Messages', row: [new Date().toISOString(), '-', '-', 'SYSTEM', 'check-sheet.js connection test'] });
  if (r.json && r.json.ok) {
    ok(`Test row written to the Messages tab${r.json.row ? ' (row ' + r.json.row + ')' : ''}${r.json.spreadsheet ? ' in "' + r.json.spreadsheet + '"' : ''}`);
  } else if (r.json && r.json.error === 'forbidden') {
    bad('SHEET_SECRET in .env does not match SECRET in the Apps Script', 'Make both exactly identical (no spaces, no quotes), save, redeploy a New version');
  } else bad('Write failed: ' + JSON.stringify(r.json || r.raw), 'See the error above. "Cannot read properties of null" means the script is not attached to a sheet: set SHEET_ID.');

  console.log(failed ? `\n❌ ${failed} problem(s) found. Fix them in order, then run this again.\n`
    : '\n🎉 All checks passed. Open the spreadsheet above, go to the "Messages" tab and look for the row "check-sheet.js connection test".\n');
})();
