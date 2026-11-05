// Paste this into Google Sheet > Extensions > Apps Script, then Deploy > New deployment > Web app
// (Execute as: Me, Who has access: Anyone). Change SECRET to a long random text.
const SECRET = 'Munnanngi_Mohan_Reddy_sv_developes_whatsapp_cahtbot';   // must match SHEET_SECRET in the bot's .env
// Only needed if this script was NOT created from the sheet via Extensions > Apps Script (standalone script).
// Paste the spreadsheet ID here (the long text in the sheet URL between /d/ and /edit). Otherwise leave empty.
const SHEET_ID = '';
const VERSION = 'v6';

const SHEETS = {
  Messages: ['Time', 'Phone', 'Name', 'Direction', 'Message'],
  Leads: ['Time', 'Phone', 'Name', 'Type', 'Detail', 'Status'],
  Customers: ['Phone', 'Name', 'WhatsApp Name', 'Interested In', 'First Seen', 'Last Seen', 'Messages', 'Last Message', 'Contact Number'],
};
 
// Lets you test the deployment: open the /exec URL in an incognito window.
// You should see {"ok":true,...}. A Google sign-in page means "Who has access" is not "Anyone".
function doGet() {
  const ss = ss_();
  return reply_({
    ok: true, version: VERSION, message: 'SV Developers sheet logger is running',
    spreadsheet: ss ? ss.getName() : '(NOT CONNECTED: no spreadsheet found, set SHEET_ID)',
    url: ss ? ss.getUrl() : '',
  });
}
 
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return reply_({ ok: false, error: 'forbidden' });
    const headers = SHEETS[d.sheet];
    if (!headers) return reply_({ ok: false, error: 'unknown sheet' });
    if (d.sheet === 'Customers') return reply_(upsertCustomer_(d));   // one row per customer
    const sh = getSheet_(d.sheet, headers);
    const row = d.row.map(String);
    const range = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
    range.setNumberFormat('@');          // store as plain text (keeps phone numbers intact)
    range.setValues([row]);
    SpreadsheetApp.flush();
    return reply_({ ok: true, row: sh.getLastRow(), spreadsheet: sh.getParent().getName() });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
 
// Customers tab: one row per phone number, updated every time they message
function upsertCustomer_(d) {
  const sh = getSheet_('Customers', SHEETS.Customers);
  const r = d.row.map(String);                       // [phone, name, waName, interested, time, lastMessage, contact]
  const phone = r[0], name = r[1], waName = r[2], interested = r[3], time = r[4], lastMsg = r[5], contact = r[6] || '';
  const last = sh.getLastRow();
  let rowIdx = -1;
  if (last >= 2) {
    const phones = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < phones.length; i++) {
      if (String(phones[i][0]) === phone) { rowIdx = i + 2; break; }
    }
  }
  if (rowIdx === -1) {
    const row = [phone, name, waName, interested, time, time, d.inc ? '1' : '0', lastMsg, contact];
    const rg = sh.getRange(last + 1, 1, 1, row.length);
    rg.setNumberFormat('@');
    rg.setValues([row]);
    rowIdx = last + 1;
  } else {
    const cur = sh.getRange(rowIdx, 1, 1, 9).getValues()[0].map(String);
    const count = (parseInt(cur[6], 10) || 0) + (d.inc ? 1 : 0);
    const row = [phone, name || cur[1], waName || cur[2], interested || cur[3], cur[4], time, String(count), lastMsg || cur[7], contact || cur[8]];
    const rg = sh.getRange(rowIdx, 1, 1, 9);
    rg.setNumberFormat('@');
    rg.setValues([row]);
  }
  SpreadsheetApp.flush();
  return { ok: true, row: rowIdx, spreadsheet: sh.getParent().getName() };
}
 
function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
 
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
 
// Optional: run this once from the editor to check it works (authorizes the script)
function test() {
  const sh = getSheet_('Messages', SHEETS.Messages);
  Logger.log('OK: ' + sh.getName());
}
 