# x.feed Connector — Improvement Plan

Improvements identified from a review of the x.feed connector against the Tapestry API documentation, reference connectors (Bluesky, Mastodon, xml.feed), and code quality standards.

Each task is self-contained and can be implemented independently unless noted otherwise.

---

## 1. Add error handling to `verify()` and `load()`

**Files:** `x.feed/plugin.js`

Both `verify()` (L23–L119) and `load()` (L121–L143) use `async/await` but have no `try/catch`. If `sendConditionalRequest`, `xmlParse`, or any downstream call rejects, the error is silently swallowed and the user gets no feedback.

**What to do:**
- Wrap each function body in `try/catch`
- Call `processError(error)` in the catch block
- Follow the pattern used in the Mastodon and Bluesky reference connectors (see `examples/org.joinmastodon.account/plugin.js` and `examples/social.bsky.account/plugin.js`)

---

## 2. Add X-specific `discovery.json`

**Files:** `x.feed/discovery.json`

The current file is a verbatim copy of xml.feed's generic RSS discovery rules. It has no `sites` or `url` rules, so Tapestry cannot auto-detect X/Twitter profile URLs and pre-fill the handle field.

**What to do:**
- Add a `sites` array: `["x.com", "twitter.com", "xcancel.com"]`
- Add a `url` extraction rule with a regex to capture the handle from URLs like `https://x.com/username` and map it to the `handle` variable
- Remove the generic Atom/RSS 1.0 XML root detection rules (`feed`/`entry`, `rdf:RDF`/`items`) since xcancel only serves RSS 2.0. Keep the `rss`/`item` rule.
- Model after `examples/social.bsky.account/discovery.json`

**API reference:** `documentation/api/configuration/discovery.md`

---

## 3. Add `apps.json` for native app deep linking

**Files:** `x.feed/apps.json` (new file)

No `apps.json` exists. Users cannot open posts in native X/Twitter clients.

**What to do:**
- Create `x.feed/apps.json` defining the official X app (`com.atebits.Tweetie2`) with the `twitter://` URL scheme
- Item URIs from xcancel.com need to be mapped to x.com equivalents for the app to resolve them
- Follow the pattern in `examples/social.bsky.account/apps.json`

**API reference:** `documentation/api/configuration/other.md` (apps.json section)

---

## 4. Normalize annotation URI for retweets

**Files:** `x.feed/resources/x-shared.js`

At L400, `annotation.uri = feedUrl` uses the raw `feedUrl` from the RSS channel link without calling `normalizeXCancelUrl()`. This is inconsistent — item URIs and author URIs are both normalized, but the annotation URI is not.

**What to do:**
- Change to `annotation.uri = normalizeXCancelUrl(feedUrl)`
- Update the regression test in `x.feed.test/regressions.test.js` (L410 area) where the expected annotation URI currently shows the un-normalized `https://rss.xcancel.com/...` value

---

## 5. Normalize xcancel.com links in body HTML

**Files:** `x.feed/resources/x-shared.js`

Body HTML contains `href="https://rss.xcancel.com/..."` links that are never normalized. Users tapping these links land on `rss.xcancel.com` instead of `xcancel.com`.

**What to do:**
- After extracting `content` in the RSS 2.0 path (around L448), apply a normalization pass that rewrites `rss.xcancel.com` hrefs to `xcancel.com` in the HTML string
- A simple string replace on the content should suffice: `content = content.replaceAll("https://rss.xcancel.com/", "https://xcancel.com/")`
- Add a test case for this normalization

---

## 6. Remove dead code: `extractVideoUrlFromPage`

**Files:** `x.feed/resources/x-shared.js`

The function `extractVideoUrlFromPage` (L77–L93) is defined but never exported, never called, and never tested. Already documented in `x.feed.test/TODO.md`.

**What to do:**
- Delete the function and its comment block
- Update `x.feed.test/TODO.md` to remove the investigation item (or delete the file if empty)

---

## 7. Clean up `if (true)` guards on UTM stripping

**Files:** `x.feed/resources/x-shared.js`

Three occurrences of `if (true) { ... }` wrap UTM parameter stripping logic (L272, L440, L555). This is dead conditional logic inherited from xml.feed with a comment saying "if this causes problems, we can put it behind a setting."

**What to do:**
- Remove the `if (true) { ... }` wrapper at all three locations
- Keep the UTM stripping code itself, just un-indent it one level
- Remove the associated comments about putting it behind a setting

---

## 8. Replace `var` with `let`/`const`

**Files:** `x.feed/resources/x-shared.js`

Several places use `var` instead of `let`/`const`, inconsistent with the rest of the codebase:
- L243: `var results = []` → `let results = []`
- L260: `var identity = null` → `let identity = null`
- L600: `var results = []` → `let results = []`

**What to do:**
- Replace each `var` with the appropriate `let` or `const`

---

## 9. Set annotation icon for retweets

**Files:** `x.feed/resources/x-shared.js`

At L396–L400, the retweet annotation's `icon` property is never set. The Mastodon connector sets icons for boosts. Tapestry supports SF Symbol names for annotation icons.

**What to do:**
- Set `annotation.icon` to an appropriate SF Symbol (e.g., `"arrow.2.squarepath"` for repost)
- Check the built-in symbols list in `documentation/api/configuration/actions.md` for available options

**API reference:** `documentation/api/objects/Annotation.md`

---

## 10. Remove Atom 1.0 and RSS 1.0 parsing paths

**Files:** `x.feed/resources/x-shared.js`, `x.feed/plugin.js`

The `xload()` function contains full Atom 1.0 (L198–L386) and RSS 1.0 (L588–L646) parsing paths inherited from xml.feed. These will never fire for xcancel.com (which always serves RSS 2.0) and they lack X-specific features (avatars, retweet detection, annotations).

Similarly, `verify()` in `plugin.js` has Atom 1.0 (L27–L92) and RSS 1.0 (L107–L130) verification paths that won't fire.

**What to do:**
- In `xload()`: remove the Atom 1.0 and RSS 1.0 branches, keeping only the RSS 2.0 branch and the unknown/empty fallback
- In `verify()`: remove the Atom 1.0 and RSS 1.0 branches, keeping only the RSS 2.0 branch
- The Atom-only helper code (e.g., link attribute traversal for `rel="alternate"`) can also be removed if no longer referenced

**Decision:** Agreed to remove. These are dead code for the x.feed use case.

## Implementation order

Tasks are independent unless noted. Suggested grouping for parallel execution:

**Batch A — Code cleanup (no functional changes):**
Tasks 6, 7, 8

**Batch B — Bug fixes:**
Tasks 1, 4, 5

**Batch C — New features:**
Tasks 2, 3, 9

**Final:** Run `npm test` after each batch to verify no regressions.
