# Context

This repository is focused on developing the **x.feed connector** for Tapestry. The x.feed connector accesses X/Twitter posts via the xcancel.com RSS feed. Uses Node.js and Jest for testing.

Other connectors in the `examples/` directory (xml.feed, org.joinmastodon.account, social.bsky.account) are **reference examples only** - they demonstrate the Tapestry connector API but are not under active development here.

# Repository Structure

- `x.feed/` - **PRIMARY DEVELOPMENT TARGET** - X/Twitter feed connector
- `x.feed.test/` - Test suite for x.feed connector
- `examples/` - **REFERENCE ONLY** - Example connectors (xml.feed, org.joinmastodon.account, social.bsky.account)
- `documentation/` - Tapestry API documentation and user guides

# Bash commands
- `npm test`: Run all Jest tests for x.feed

# Workflow
- After making code changes to **x.feed**, run `npm test` to ensure all tests pass
- Tests are located in `x.feed.test/` directory and validate feed parsing and data extraction
- Do NOT modify connectors in `examples/` unless explicitly asked - they are reference implementations only

# Ways of working
- Always use `manage_todo_list` to keep track of your work.
- Always use `mise` and the `.tool-versions` file to manage runtime versions
- Analyse the user's request for missing information or unclear specifications. Ask any pertinent or clarifying questions first, and only then proceed to the implementation.

## Tapestry Connector API

Tapestry connectors are JavaScript (ECMA-262) plugins that transform data sources into a unified timeline. A connector consists of configuration files and a `plugin.js` that implements interface functions.

<!-- TAPESTRY-AGENTS-MD-START -->
[Tapestry Docs Index]|root: .tapestry-docs|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning|GettingStarted.md: tutorial — creating your first connector, project structure, packaging|URLSchemes.md: URL schemes for deep linking into Tapestry|Tapestry_Loom_User_Guide.md: Tapestry Loom desktop app for connector development and testing|api/objects/Item.md: Item object — createWithUriDate, properties (uri, date, body, title, author, actions), identity/annotation/media/link/poll attachments|api/objects/Identity.md: Identity object — createWithName, properties (name, username, uri, avatar)|api/objects/Annotation.md: Annotation object — createWithText, properties (text, uri, icon)|api/objects/MediaAttachment.md: MediaAttachment — createWithUrl, properties (url, mimeType, text, blurhash, focalPoint, thumbnail, duration, width, height, aspectRatio, nsfw)|api/objects/LinkAttachment.md: LinkAttachment — createWithUrl, properties (url, title, subtitle, author, image)|api/objects/PollAttachment.md: PollAttachment — createWithOptions, PollOption, properties (options, expires, multiple, count)|api/functions/interface.md: interface functions — verify(), load(), performAction(actionId, actionValue, item), processResults(), processError(), actionComplete()|api/functions/utility.md: utility functions — sendRequest(url, method, parameters, headers, formData), processResults(items), xmlParse(text), htmlQuery(htmlText, selector, attribute), processError(error), actionComplete(item, error), generateUUID(), lookupIcon(key)|api/variables.md: runtime variables — site, creator_identifier, __ACCESS_TOKEN__, __CLIENT_ID__, __OAUTH_TOKEN_SECRET__; user-defined variables from ui-config.json|api/configuration/plugin-config.md: plugin-config.json — required/recommended/optional properties, OAuth config, JWT config, authorization header templates, crosstalk modes|api/configuration/ui-config.md: ui-config.json — input types (text, switch, choices), variable persistence, examples|api/configuration/discovery.md: discovery.json — sites rules, url extraction rules, html element matching rules, xml root/with rules, json key/value rules|api/configuration/actions.md: actions.json — action definitions (id, name, icon, role), performAction examples, context role, built-in symbols list|api/configuration/other.md: other config files — plugin.js example, README.md spec, suggestions.json (site & variable suggestions), apps.json (native app templates, URL variables)|api/html-content.md: HTML in Tapestry — preview vs detail rendering, supported preview tags (p, strong, em, a, img, blockquote, br), inline image/link attachment extraction
<!-- TAPESTRY-AGENTS-MD-END -->
