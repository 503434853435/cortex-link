# cortex-open

A one-page static site that turns `https://<host>/o#<note path>` into
`obsidian://open?vault=Cortex&file=<note path>`, so a note link can be tapped
from apps that only make https links clickable.

- The note path stays in the URL fragment, which is never sent to the server.
- The path is decoded once, checked against a strict allow-list, and encoded
  with `encodeURIComponent` before use. The vault and action are fixed.
- No cookies, analytics, frameworks, or third-party resources.

Run the tests with `node test/validate.test.js`.
