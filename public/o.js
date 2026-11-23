// Opens one Cortex note in Obsidian. The note path comes only from the URL
// fragment (after #), which browsers never send to the server.
'use strict';

var VAULT = 'Cortex';
var PREFIX = 'obsidian://open?vault=' + VAULT + '&file=';
var MAX_RAW = 1500; // cap on the still-encoded fragment
var MAX_LEN = 300;  // cap on the decoded note path
// Letters, digits, space and - _ . , ( ) & ' / plus Latin-1 and Latin
// Extended-A accented letters (excluding the × and ÷ signs).
var ALLOWED = /^[A-Za-z0-9 \-_.,()&'\/\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F]+$/;

// Returns {ok: true, path, url} or {ok: false, reason}.
function parseFragment(hash) {
  if (typeof hash !== 'string') return { ok: false, reason: 'missing' };
  var raw = hash.charAt(0) === '#' ? hash.slice(1) : hash;
  if (raw.length === 0) return { ok: false, reason: 'missing' };
  if (raw.length > MAX_RAW) return { ok: false, reason: 'too long' };
  var path;
  try {
    path = decodeURIComponent(raw); // decode exactly once
  } catch (e) {
    return { ok: false, reason: 'bad encoding' };
  }
  path = path.normalize('NFC');
  if (path.length > MAX_LEN) return { ok: false, reason: 'too long' };
  if (!ALLOWED.test(path)) return { ok: false, reason: 'bad character' };
  if (path.charAt(0) === '/') return { ok: false, reason: 'leading slash' };
  if (path.indexOf('..') !== -1) return { ok: false, reason: 'dot dot' };
  if (path.indexOf('//') !== -1 || path.charAt(path.length - 1) === '/') {
    return { ok: false, reason: 'empty folder name' };
  }
  return { ok: true, path: path, url: PREFIX + encodeURIComponent(path) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseFragment: parseFragment, PREFIX: PREFIX };
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var result = parseFragment(window.location.hash);
    var nameEl = document.getElementById('name');
    var linkEl = document.getElementById('open');
    var msgEl = document.getElementById('msg');
    if (!result.ok) {
      msgEl.textContent = 'This link is not valid, so nothing was opened.';
      return;
    }
    nameEl.textContent = result.path;
    linkEl.setAttribute('href', result.url);
    linkEl.hidden = false;
    msgEl.textContent = 'Opening in Obsidian. If nothing happens, tap the button.';
    window.location.href = result.url;
  });
}
