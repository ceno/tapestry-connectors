# Context

This repository is focused on developing the **x.feed connector** for Tapestry. The x.feed connector accesses X/Twitter posts via the xcancel.com RSS feed. Uses Node.js and Jest for testing.

Other connectors in the `examples/` directory (xml.feed, org.joinmastodon.account, social.bsky.account) are **reference examples only** - they demonstrate the Tapestry connector API but are not under active development here.

# Repository Structure

- `x.feed/` - **PRIMARY DEVELOPMENT TARGET** - X/Twitter feed connector
- `x.feed.test/` - Test suite for x.feed connector
- `_shared/` - Shared utility code used by reference examples
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
