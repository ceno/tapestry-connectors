This connector displays Instagram posts for a given username.

Posts are fetched directly from Instagram's public endpoints (GraphQL API with embed page fallback).

## Features

- **Content Filtering**: Filter posts by content type (images, videos, carousels, or combinations)
  - All Posts (default)
  - Images Only
  - Videos Only
  - Carousels Only (posts with multiple images/videos)
  - Images & Carousels
  - Videos & Carousels

- **Session ID Support**: Optionally provide a Session ID (from browser cookies) to reduce rate limiting. Use a dedicated/throwaway account if providing a session ID, as Instagram may flag automated access.

## Configuration

### Required
- **Instagram Handle**: The username of the account to follow (e.g., `natgeo`)

### Optional
- **Content Filter**: Choose which types of posts to display (default: All Posts)
- **Use Session ID**: Enable to provide a session ID for authenticated requests
- **Session ID**: Cookie value from browser DevTools → Cookies → sessionid
- **Debug Mode**: Enable debug logging to the console

