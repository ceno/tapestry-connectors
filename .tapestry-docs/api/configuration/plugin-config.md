# plugin-config.json

Each connector is defined using the following files:

  * `plugin-config.json` (Required)
  * `plugin.js` (Required)
  * `ui-config.json` (Optional) — see [ui-config.md](ui-config.md)
  * `README.md` (Recommended)
  * `suggestions.json` (Optional) — see [other.md](other.md)
  * `discovery.json` (Optional) — see [discovery.md](discovery.md)
  * `actions.json` (Optional) — see [actions.md](actions.md)
  * `apps.json` (Optional) — see [other.md](other.md)

## Required properties

  * id: `String` with reverse domain name for uniqueness (e.g. org.joinmastodon or blog.micro)
  * display_name: `String` with name that will be displayed in user interface

## Recommended properties

  * site: `String` with the primary endpoint for the connector's API. This parameter is used in several different contexts:

  	- If not provided, the user will be prompted for a URL during setup. If you are accessing an API with a single endpoint, please provide a value. In cases where each instance of the source will need its own site, for example a Mastodon instance or an RSS feed, do not provide a value and let the user set it up.
  	- The value will also be used as a base URL for relative authentication URLs (see the NOTE below).
  	- The configured value or a value provided by the user will be provided as a JavaScript variable.
  	- The configured value or a value provided by the user will be used to control when Tapestry sends an "Authorization" HTTP header. If the request's scheme is "https" on the default port (443) and the same domain or subdomain of `site`, the header will be included.

  * site_prompt: `String` with a prompt for user input.
  * site_placeholder: `String` with a placeholder for user input.
    - If no `site` is configured, these properties are required.
  * site_help: `String` with a short description of what's required for `site`.

  * icon: `String` with a URL to an image that will be used as a default for this connector.
  * service_name: `String` with the name of the service (e.g. "Tumblr", "YouTube", "Blog", "Podcast").
  * default_color: `String` with a default color name for feeds created by the connector. Valid values are "purple", "gold", "blue", "coral", "slate", "orange", "green", "teal". If no value is specified, "gray" will be used.
  * item_style: `String` with either "post" or "article" to define the content layout.
  * version: `Number` with an integer value that increments with newer versions of the connector. If no value is supplied, 1 is assumed.
  * crosstalk: `String` with "inclusive", "exclusive", or "disabled". See Crosstalk section below.
  * minimum_app_version: `String` with the version number of the Tapestry app that must be used for the connector. If the app version is lower than the specified value, the connector will be ignored until a newer version is installed. **Some API behaviors are also influenced by this setting!**

## Optional properties

  * needs_verification: `Boolean` with true if verification is needed (by calling `verify()`)
  * verify_variables: `Boolean` with true if variable changes cause verification. Use this option if changing a variable will affect loading content (because it's a part of a URL, for example).
  * provides_attachments: `Boolean` with true if connector generates attachments directly, otherwise post-processing of HTML content will be used to capture images, videos, and link previews.
  * authorization_header: `String` with a template for the authorization header. If no value is specified, "Bearer \_\_ACCESS\_TOKEN\_\_" will be used. See below for options.
  * refresh_status_code: `Number` with the HTTP status code that indicates authorization needs to be refreshed. Default value is 401. A value of 0 will not attempt to refresh tokens.
  * check_interval: `Number` with number of seconds between load requests (currently unimplemented).
  * synchronizable_credentials: `Boolean` allows feed authentication tokens to be synced using iCloud keychain when `true` (default is `true`).
  * hidden_tag_classes: `Array` of `String`s of HTML CSS class names. HTML tags in an item's body with a matching class will be hidden when rendering the item preview for the timeline.

## Optional OAuth properties

  * register: `String` with endpoint to register the Tapestry app (e.g. "/api/v1/apps").
  * oauth_authorize: `String` with endpoint to authorize account (e.g. "/oauth/authorize").
  * oauth_token: `String` with endpoint to get bearer token (e.g. "/oauth/token").
  * oauth_type: `String` with response type parameter (currently, only "code" is supported).
  * oauth_code_key: `String` with code result from authorize endpoint (e.g "code").
  * oauth_scope: `String` with scope used to register and get token (e.g. "read+write+push").
  * oauth_grant_type: `String` with grant type (currently, only "authorization_code" is supported).
  * oauth_http_redirect: `Boolean`, with true, the OAuth redirect URI will be "https://iconfactory.com/tapestry-oauth", otherwise "tapestry://oauth" is used.
  * oauth_basic_auth: `Boolean`, with true, the client id and secret will be added to a Basic authentication header when generating or refreshing tokens.
  * oauth_authorize_omit_secret: `Boolean`, with true, the client secret will not be sent to the `oauth_authorize` endpoint. This is needed for Google's OAuth 2.0 server.
  * oauth_extra_parameters: `String` with extra parameters for authorization request (e.g. "&duration=permanent&foo=bar")
  * needs_api_keys: `Boolean`, with true, user interface will prompt for OAuth API keys and store them securely in the user's keychain. Ignored if a `register` endpoint is specified or if there is no `oauth_authorize` endpoint.

## Optional JWT properties

  * jwt_prompt: `String` with account information needed to login (e.g. "Email Address").
  * jwt_authorize: `String` with endpoint to authorize account (e.g. "/xrpc/createSession").
  * jwt_refresh: `String` with endpoint to refresh account (e.g. "/xrpc/refreshSession").

> **Note:** When using OAuth, Tapestry looks for `access_token` and `refresh_token` during the token exchange. With JWT, `accessJwt` and `refreshJwt` are used. These values are stored securely in the users' keychain.

> **Note:** The oauth_authorize, oauth_token, jwt_authorize, and jwt_refresh endpoints can be relative or absolute URLs. Relative paths use the `site` variable above as a base (allowing a single connector to support multiple federated servers, like with Mastodon). Absolute paths allow different domains to be used for the initial authorize and token generation (as with Tumblr).

## Authorization Header

The `authorization_header` string provides a template for the API endpoints. The following items in the string will be replaced with values managed by the Tapestry app:

  * `__ACCESS_TOKEN__` The access token returned when authenticating with OAuth or JWT.
  * `__CLIENT_ID__` The client ID used to identify the connector with the API.

For example, a string value of `OAuth oauth_consumer_key="__CLIENT_ID__", oauth_token="__ACCESS_TOKEN__"` will generate the following header:

```
Authorization: OAuth oauth_consumer_key="dead-beef-1234" oauth_token="feed-face-5678"
```

Any credentials collected by Tapestry are used automatically during a `sendRequest`. An authorization header will be added when the following are true:

  * URL scheme is HTTPS
  * Port is 443
  * The host is a domain or subdomain of the feed's URL. For example, if the feed originates at `example.com`, requests to `api.example.com` will get the header, but requests to `1337hacker.com` will not.

## Crosstalk

Connectors can be configured for Tapestry's Crosstalk feature using the `crosstalk` property. The options are:

  * `inclusive`: Crosstalk checks items in this connector's feeds and all items in other feeds where Crosstalk is enabled. This is the default behavior.
  * `exclusive`: Crosstalk is only checked with items from other feeds that _do not_ use this connector. If two items are similar and use the same connector, they are _not marked_ as Crosstalk. This mode is used by some connectors to prevent daily items from being labeled as Crosstalk even though they have very similar content ("FoxTrot" and "FoxTrot Classics", for example).
  * `disabled`: Opts this connector entirely out of Crosstalk. Items from feeds using this connector will never be checked or labeled as Crosstalk even if they are similar to an item in another feed.

## Examples

The configuration for the Mastodon connector is:

```json
{
	"id": "org.joinmastodon",
	"display_name": "Mastodon",
	"register": "/api/v1/apps",
	"oauth_authorize": "/oauth/authorize",
	"oauth_token": "/oauth/token",
	"oauth_type": "code",
	"oauth_code_key": "code",
	"oauth_scope": "read+write+push",
	"oauth_grant_type": "authorization_code",
	"provides_attachments": true,
	"check_interval": 300
}
```

The configuration for the JSON Feed connector is:

```json
{
	"id": "org.jsonfeed",
	"display_name": "JSON Feed",
	"needs_verification": true,
	"check_interval": 300
}
```
