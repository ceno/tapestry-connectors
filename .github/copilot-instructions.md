# Context

This repository contains active Tapestry connectors for `x.feed`, `instagram.feed`, and `youtube.feed`. It uses Node.js CommonJS, Jest for tests, GNU Make for packaging, and `mise` with `.tool-versions` to pin Node 24.

The connectors in `examples/` are reference implementations only and should not be modified unless explicitly requested.

# Repository Structure

- `x.feed/`, `instagram.feed/`, `youtube.feed/` - active connector implementations
- `x.feed.test/`, `instagram.feed.test/`, `youtube.feed.test/` - Jest suites for active connectors
- `examples/` - reference connectors only
- `.tapestry-docs/` - Tapestry API docs and guides
- `Makefile` - connector discovery and `.tapestry` packaging

# Bash commands
- `mise exec -- npm test`: Run all Jest connector tests
- `mise exec -- make list`: Show which connectors will be packaged
- `mise exec -- make build`: Build `.tapestry` bundles for discovered connectors

# Workflow
- Always use `mise` and the `.tool-versions` file for runtime-sensitive commands.
- Default to the smallest affected connector and test surface, but run `mise exec -- npm test` whenever shared parsing helpers or shared resources change.
- Run `mise exec -- make list` when a task changes connector discovery assumptions.
- Run `mise exec -- make build` when a task changes packaging inputs such as `plugin.js`, `plugin-config.json`, or bundled resources.
- Do NOT modify anything under `examples/` unless explicitly asked.

# Ways of working
- Always use `manage_todo_list` to keep track of your work.
- Prefer retrieval-led use of the Tapestry docs index below over guessing API details.
- Ask clarifying questions only when a required detail is missing in an interactive session; unattended orchestration runs should continue autonomously until blocked by missing permissions, secrets, or external configuration.

## Tapestry Connector API

Tapestry connectors are JavaScript (ECMA-262) plugins that transform data sources into a unified timeline. A connector consists of configuration files and a `plugin.js` that implements interface functions.

<!-- TAPESTRY-AGENTS-MD-START -->
[Tapestry Docs Index]|root: .tapestry-docs|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning|GettingStarted.md: tutorial — creating your first connector, project structure, packaging|URLSchemes.md: URL schemes for deep linking into Tapestry|Tapestry_Loom_User_Guide.md: Tapestry Loom desktop app for connector development and testing|api/objects/Item.md: Item object — createWithUriDate, properties (uri, date, body, title, author, actions), identity/annotation/media/link/poll attachments|api/objects/Identity.md: Identity object — createWithName, properties (name, username, uri, avatar)|api/objects/Annotation.md: Annotation object — createWithText, properties (text, uri, icon)|api/objects/MediaAttachment.md: MediaAttachment — createWithUrl, properties (url, mimeType, text, blurhash, focalPoint, thumbnail, duration, width, height, aspectRatio, nsfw)|api/objects/LinkAttachment.md: LinkAttachment — createWithUrl, properties (url, title, subtitle, author, image)|api/objects/PollAttachment.md: PollAttachment — createWithOptions, PollOption, properties (options, expires, multiple, count)|api/functions/interface.md: interface functions — verify(), load(), performAction(actionId, actionValue, item), processResults(), processError(), actionComplete()|api/functions/utility.md: utility functions — sendRequest(url, method, parameters, headers, formData), processResults(items), xmlParse(text), htmlQuery(htmlText, selector, attribute), processError(error), actionComplete(item, error), generateUUID(), lookupIcon(key)|api/variables.md: runtime variables — site, creator_identifier, __ACCESS_TOKEN__, __CLIENT_ID__, __OAUTH_TOKEN_SECRET__; user-defined variables from ui-config.json|api/configuration/plugin-config.md: plugin-config.json — required/recommended/optional properties, OAuth config, JWT config, authorization header templates, crosstalk modes|api/configuration/ui-config.md: ui-config.json — input types (text, switch, choices), variable persistence, examples|api/configuration/discovery.md: discovery.json — sites rules, url extraction rules, html element matching rules, xml root/with rules, json key/value rules|api/configuration/actions.md: actions.json — action definitions (id, name, icon, role), performAction examples, context role, built-in symbols list|api/configuration/other.md: other config files — plugin.js example, README.md spec, suggestions.json (site & variable suggestions), apps.json (native app templates, URL variables)|api/html-content.md: HTML in Tapestry — preview vs detail rendering, supported preview tags (p, strong, em, a, img, blockquote, br), inline image/link attachment extraction
<!-- TAPESTRY-AGENTS-MD-END -->
