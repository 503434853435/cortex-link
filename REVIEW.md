# Security self-review - cortex-open link page (23 Nov 2026)

Reviewed line by line before deploy. Files: public/o.html, public/o.js, public/o.css,
public/index.html, public/robots.txt, render.yaml, test/validate.test.js.

## What the page can do
Exactly one thing: build `obsidian://open?vault=Cortex&file=<encoded path>` from the URL
fragment and navigate to it. The scheme, the `open` action and the vault are string
constants. There is no other code path, no network request, no storage, no cookies.

## Threats checked

| Threat | Result | Why |
| --- | --- | --- |
| XSS (script via the link) | Mitigated in reviewed code | The path is written only with `textContent`; the button target with `setAttribute('href', ...)` on a value that always starts with the fixed `obsidian://open?vault=Cortex&file=` prefix. No `innerHTML`, `eval`, `document.write`, inline scripts or inline handlers. The CSP (`script-src 'self'`, `default-src 'none'`) would block injected script even if one got in. |
| Open redirect | Mitigated in reviewed code | The page never navigates to anything but the fixed obsidian:// prefix. A full URL in the fragment fails the allow-list (`:` and `?` are not allowed). |
| Scheme injection (`javascript:`, `data:`, other apps) | Mitigated in reviewed code | The scheme is a constant; `:` is rejected in the path; the path is placed after `file=` and percent-encoded. |
| Parameter injection into the obsidian URL (`&vault=`, `?`, `#`, `=`) | Mitigated in reviewed code | `?`, `=`, `#`, `%`, `+` are outside the allow-list. `&` is allowed (real note names use it) but `encodeURIComponent` turns it into `%26`. The test parses every built link and asserts the only parameters are `vault=Cortex` and `file=<path>`. |
| Advanced URI / commands | Not reachable | The action is fixed to `open`; no `adv-uri`, `commandid`, `new`, `search` or other action can be formed. Worst case for a forged link: Obsidian opens, or offers to create, a note in Cortex with an allowed name. |
| Path tricks (`..`, leading `/`, `\`, `//`, trailing `/`) | Rejected | Checked after a single decode, so `%2e%2e` and `%2F..` are caught. Double-encoding (`%252e`) leaves a `%`, which is rejected. Obsidian resolves paths inside the vault anyway. |
| Control and invisible characters (`%0A`, `%00`, tab, RTL override, zero-width space) | Rejected | Not in the allow-list. Unicode is NFC-normalised before checking, so decomposed accents still pass and look-alikes such as the full-width slash fail. |
| Over-long input | Rejected | Raw fragment capped at 1500 characters before decoding; decoded path capped at 300. |
| Malformed percent-encoding | Rejected | `decodeURIComponent` throws; caught and shown as invalid. |
| Note names leaking to the server or third parties | Avoided | The path is after `#`, which browsers never send in requests. `Referrer-Policy: no-referrer` (header and meta) stops it leaking onwards; the page loads only its own CSS and JS. |
| Clickjacking / framing | Blocked | `frame-ancestors 'none'` (header CSP) and `X-Frame-Options: DENY`. |
| MIME sniffing | Blocked | `X-Content-Type-Options: nosniff`. |
| Indexing | Blocked | `robots` meta, `X-Robots-Tag` header and `robots.txt` all say no. |
| Supply chain | None | No dependencies, frameworks, CDNs, fonts or build step (`buildCommand: true`). The Node test uses only built-ins. |

## Headers (set in render.yaml; live verification recorded below)
- Content-Security-Policy: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer
- X-Frame-Options: DENY
- X-Robots-Tag: noindex, nofollow
- Permissions-Policy: camera, microphone, geolocation, payment, usb all off
- Cross-Origin-Opener-Policy: same-origin

The meta CSP in o.html repeats the header policy (minus frame-ancestors, which meta cannot set),
so the page stays locked down even if the host headers were lost.

## Residual risks, accepted
- Anyone who learns the address can use it, but all it does is ask their own Obsidian to open
  a note in a vault called Cortex on their own device. Nothing about the user's vault is exposed.
- Someone could send the user a forged link that opens or offers to create an odd-named note.
  The exact behaviour for missing notes depends on the Obsidian version and was not tested.
- The page auto-navigates on load. Browsers show their own "Open Obsidian?" prompt.
- Note names containing characters outside the allow-list (for example `:`, `#`, `%`, `+`,
  `=`, emoji, or `...`) cannot be linked. They get the "not valid" message.
- The public repo holds only this page; anyone can read the code, which is fine.

## Tests
`node test/validate.test.js`: 52 checks (11 good paths, 41 bad ones including `javascript:`,
`..`, `%2e%2e`, `%252e%252e`, `%0a`, `%00`, RTL override, 301 and 1800 character input,
`&vault=`, `?vault=`, `#`, HTML tags, overlong UTF-8). All pass.

## Live check (23 Nov 2026, 08:30 GMT)
- Base: https://cortex-open-uwah.onrender.com/o#<encoded path>
- curl: /o, /o.html, /o.js, /o.css, / and /robots.txt all return 200 with every header above,
  no Set-Cookie, correct content types; the live o.js is byte-identical to this folder's copy.
- Headless Chrome: the three real note links show the note name, unhide the button with the
  expected obsidian:// target, and make no request other than the page's own files and the
  obsidian:// hand-off. An `<img onerror>` payload, `javascript:alert(1)` and `x&vault=Other`
  all show "not valid", leave the button hidden and make no hand-off. No CSP violations logged.
- Chrome logged "user gesture required" for the automatic hand-off on repeat loads in one
  headless session, so the visible button is the reliable path; a tap from chat normally counts
  as the gesture.
