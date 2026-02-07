# Copilot Instructions for tapestry-connectors

## Project Overview

This repository contains Tapestry feed connectors that allow Tapestry to access content from various social media platforms. Each connector is a self-contained directory that gets packaged into a `.tapestry` file (zip archive).

## Technology Stack

- **Language**: JavaScript (CommonJS modules)
- **Testing**: Jest
- **Build**: Bash scripts with zip compression
- **CI/CD**: GitHub Actions

## Project Structure

- `x.feed/` - X (Twitter) feed connector implementation
- `x.feed.test/` - Jest tests for x.feed connector
- `build.sh` - Build script that creates .tapestry packages
- `.github/workflows/build.yml` - CI/CD pipeline

## Coding Standards

### JavaScript Conventions

- Use CommonJS module system (`require()`, not ES6 imports)
- Follow the existing code style in connector files
- Use async/await for asynchronous operations
- Include appropriate error handling with descriptive error messages

### Connector Structure

Each connector must include:
- `plugin.js` - Main plugin implementation
- `plugin-config.json` - Configuration metadata
- `README.md` - Connector documentation
- Optional: `resources/` directory for assets
- Optional: `discovery.json`, `suggestions.json`, `ui-config.json` for UI configuration

### Testing

- Place tests in a separate directory with `.test` suffix (e.g., `x.feed.test/`)
- Use Jest for testing
- Test files should end with `.test.js`
- Run tests with `npm test`
- Tests should validate core functionality and handle edge cases

## Build and Deployment

### Building Connectors

- Use `build.sh` to create .tapestry packages: `./build.sh <connector-directory>`
- The build script validates required files and creates a zip archive
- Exclude temporary files and OS metadata (`.DS_Store`, `__MACOSX`)

### CI/CD

- GitHub Actions automatically builds and releases on pushes to main branch
- Version format: `YYYY.MM.DD`b{build_number}
- Releases include the .tapestry package and auto-generated release notes

## Best Practices

### When Making Changes

1. **Minimal Modifications**: Make the smallest possible changes to achieve the goal
2. **Test First**: Run existing tests before making changes to understand baseline
3. **Preserve Functionality**: Don't break existing working code
4. **Follow Patterns**: Match the style and patterns of existing connectors
5. **Document Changes**: Update README files when adding new features

### Connector Development

- Use user agent strings that match RSS readers to avoid being blocked
- Parse RSS/Atom feeds carefully, handling both single values and arrays
- Implement `verify()` function to validate connector configuration
- Handle errors gracefully with informative messages
- Test with real feed data when possible

### Security

- Never commit API keys, tokens, or credentials
- Validate and sanitize external data from feeds
- Handle network errors appropriately
- Use HTTPS for all external requests

## Dependencies

- Keep dependencies minimal and well-justified
- Document why new dependencies are needed
- Prefer built-in Node.js features when possible
- Update dependencies only when necessary for security or functionality

## Git Workflow

- Work on feature branches
- Write clear, descriptive commit messages
- Don't commit build artifacts (.tapestry files) or node_modules
- Use .gitignore to exclude temporary files

## Common Tasks

### Adding a New Connector

1. Create a new directory with the connector name
2. Add required files: `plugin.js`, `plugin-config.json`, `README.md`
3. Implement connector logic following x.feed patterns
4. Create a corresponding test directory
5. Add tests to validate functionality
6. Update build scripts/workflows if needed

### Debugging Issues

- Check test output first: `npm test`
- Validate connector package structure
- Review build logs in GitHub Actions
- Test feed parsing with sample XML/JSON data
