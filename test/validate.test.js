'use strict';
const assert = require('node:assert');
const { parseFragment, PREFIX } = require('../public/o.js');

let n = 0;
function good(hash, expectedPath) {
  const r = parseFragment(hash);
  assert.strictEqual(r.ok, true, `expected ok for ${JSON.stringify(hash)}: ${r.reason}`);
  assert.strictEqual(r.path, expectedPath);
  assert.ok(r.url.startsWith(PREFIX), 'fixed prefix');
  // The built link must parse back to exactly vault=Cortex and file=<path>.
  const u = new URL(r.url);
  assert.strictEqual(u.protocol, 'obsidian:');
  assert.deepStrictEqual([...u.searchParams.keys()], ['vault', 'file']);
  assert.strictEqual(u.searchParams.get('vault'), 'Cortex');
  assert.strictEqual(u.searchParams.get('file'), expectedPath);
  assert.ok(!/[\s"<>#?]/.test(r.url.slice(PREFIX.length)), 'no raw delimiters after prefix');
  n++;
}
function bad(hash, label) {
  const r = parseFragment(hash);
  assert.strictEqual(r.ok, false, `expected reject (${label}) for ${JSON.stringify(hash)}`);
  assert.strictEqual(r.url, undefined);
  n++;
}

// Good paths
good('#000%20System%2FImprove%20habits%2FProtocols%2FDesk%20cue%20protocol',
  '000 System/Improve habits/Protocols/Desk cue protocol');
good('#000%20System/User%20Guide', '000 System/User Guide');
good('#000%20System%2FImprove%20habits%2FProtocols%2FMorning%20prime%20(winter)',
  '000 System/Improve habits/Protocols/Morning prime (winter)');
good('#Notes%20%26%20ideas', 'Notes & ideas');
good("#Today's%20list%2C%20v1.2", "Today's list, v1.2");
good('#Caf%C3%A9%20r%C3%A9sum%C3%A9', 'Café résumé');
good('#Cafe%CC%81', 'Café'); // decomposed accent normalised to NFC
good('#Zo%C3%AB%20%C5%81%C3%B3d%C5%BA', 'Zoë Łódź');
good('#a_b-c.md', 'a_b-c.md');
good('#' + 'a'.repeat(300), 'a'.repeat(300));
// "&vault=..." injection is harmless only if it is rejected or encoded; '=' is
// not allowed, so it is rejected below. A bare & is encoded as %26:
good('#A%26B', 'A&B');

// Bad paths
bad('', 'empty');
bad('#', 'empty');
bad(undefined, 'missing');
bad('#javascript:alert(1)', 'javascript scheme');
bad('#javascript%3Aalert(1)', 'encoded javascript scheme');
bad('#obsidian%3A%2F%2Fadv-uri%3Fcommandid%3Dx', 'other obsidian action');
bad('#data:text/html,<script>', 'data scheme');
bad('#https%3A%2F%2Fevil.example', 'url');
bad('#..%2Fsecret', 'dot dot');
bad('#a%2F..%2Fb', 'dot dot middle');
bad('#%2e%2e%2Fsecret', 'encoded dot dot');
bad('#%252e%252e%252F', 'double encoded dot dot');
bad('#a%0Ab', 'newline');
bad('#a%0Db', 'carriage return');
bad('#a%00b', 'nul');
bad('#a%09b', 'tab');
bad('#a%E2%80%AEb', 'right-to-left override');
bad('#%2Fetc%2Fpasswd', 'leading slash');
bad('#/abs', 'leading slash raw');
bad('#a%5Cb', 'backslash');
bad('#a\\b', 'backslash raw');
bad('#C%3A%2FUsers', 'colon');
bad('#' + 'a'.repeat(301), 'over 300 decoded');
bad('#' + '%20'.repeat(600), 'over raw cap');
bad('#x%26vault%3DOther', 'vault injection with &');
bad('#x%3Fvault%3DOther', 'vault injection with ?');
bad('#x&vault=Other', 'raw vault injection');
bad('#x?vault=Other', 'raw ? injection');
bad('#x%23y', 'hash');
bad('#%3Cscript%3Ealert(1)%3C%2Fscript%3E', 'html tags');
bad('#a%22b', 'double quote');
bad('#a%25b', 'percent');
bad('#%E0%A4%A', 'malformed encoding');
bad('#%C0%AE%C0%AE', 'overlong utf-8 dot');
bad('#a//b', 'empty segment');
bad('#a/', 'trailing slash');
bad('#a=b', 'equals');
bad('#a+b', 'plus');
bad('#a%C3%97b', 'multiplication sign');
bad('#a%E2%80%8Bb', 'zero width space');
bad('#a%EF%BC%8Fb', 'fullwidth slash');

console.log(`ok - ${n} checks passed`);
