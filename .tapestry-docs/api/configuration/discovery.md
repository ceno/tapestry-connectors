# discovery.json

This file helps the user find your connector when they have a URL to a page of HTML. The rules in this file will be checked and if all constraints match, the connector will be suggested to the user in an interface that simplifies set up.

The file consists of three categories: one specifies a list of sites where the connector can be used, the other two specify a list of rules for the URL and HTML.

```json
{
	"sites": [],
	"url": [],
	"html": [],
	"xml": []
}
```

All three categories must match in order to be displayed. If one of these categories is not supplied, it has no constraints, so it is considered a match.

## sites

The sites category is a list of strings where the connector can be used. These checks are performed on the URL that is supplied by the user.

For example, the `com.example` connector only works on one site so it uses:

```json
"site": [
	"example.com"
],
```

The YouTube connector will work on many different domains. Note that "youtube." will match "youtube.de", "youtube.fr", as well as the more familiar "youtube.com". The match does not use regular expressions.

```json
"site": [
	"youtube.",
	"youtu.be",
	"youtubekids.com"
],
```

Matches are case insensitive. If a user types "YouTube.com/@iJustine", it will match the "youtube." rule above.

If the sites rules do not match, no further checks are performed and the connector is not suggested to the user.

## url

The rules for the user's URL consist of two parts:

  * extract (required): a regex pattern that will be used on the URL and passed to the `variable`.
  * variable (required): `site` or any variable defined in `ui-config.json` that will be set using `extract`.

If the `extract` pattern is empty it's considered a match and the full URL will be passed to the variable (this will likely be the `site`). The following example sets the `site` variable with the URL entered by the user.

```json
"url": [
	{
		"extract": "",
		"variable": "site"
	}
]
```

The `extract` regex pattern begins and ends with a single slash ("/") character. If no match is found, the rule fails and the connector is not offered as a suggestion. The `variable` parameter can contain a single variable name or a comma separated list.

All regular expressions are, like the web itself, case insensitive. The pattern "/foo/" will match "FOOBAR" in both the URL and HTML.

If necessary, non-capturing groups like "(?:foo|bar)" can be used in the regular expression.

This example extracts the "aww" from `http://reddit.com/r/aww/whatever` and puts it in a "subreddit" variable:

```json
"url": [
	{
		"extract": "/reddit.com/r/([^/]+)/",
		"variable": "subreddit"
	}
]
```

This example extracts two capture groups from `https://mastodon.social/tags/TapestryApp`. The first one sets `site` to "https://mastodon.social" and the second puts "TapestryApp" in a "tag" variable:

```json
"url": [
	{
		"extract": "/(https://[^:/\\s]+)/tags/([a-zA-Z0-9_]+.*)/",
		"variable": "site, tag"
	}
]
```

## html

The content at the URL provided by the user can also be checked. The strategy is to collect all elements of a specific type, check an attribute of those elements, see if it matches, and then optionally save all or part of a match in a variable.

This approach allows your connector to check things like `<link>` or `<meta>` tags for things that it needs. For example, a page that has the following HTML markup can be used with a connector that handles RSS feeds:

```html
<link rel="alternate" type="application/atom+xml" href="/feeds/main" />
```

The `html` rules use the following properties:

  * element (required): the elements in the HTML to check: "link", "meta", or any other tag.
  * check (required): the attribute in the element to check
  * match (required): a string _or_ regex pattern that will be used to find matching attribute values
  * use (optional): the attribute in the element that contains a value to use with the connector
  * extract (optional): a string _or_ regex pattern that will be used on the value specified by `use` and passed to the `variable`.
  * variable (optional): `site` or any variable defined in `ui-config.json` that will be set using `extract`.

Both `match` and `extract` can be:

  * a string to match (e.g. "Mastodon" or "application/rss+xml")
  * a regex pattern that begins and ends with a single slash ("/") (e.g. "/example.com/([^/]+)/")

The HTML rule will fail if any of the following are true:

  * The HTML contains no `element` tags.
  * If no `check` attribute exists, or if the `match` is not satisfied.
  * If `use` is specified and no `extract` match is found.

Finally, the "href" attribute value in a `use` property will always return an absolute URL, even if there is a relative URL in the document. Variables, specifically `site`, will need a fully qualified domain name to access data since the connector has no notion of a base URL.

### Examples

The first example shows how to get the URL for an RSS feed. Note the use of a `match` pattern with a non-capturing group that allows both the RSS and Atom formats:

```json
"html": [
	{
		"element": "link",
		"check": "type",
		"match": "/application/(?:rss|atom)\\+xml/",
		"use": "href",
		"variable": "site"
	}
]
```

Also note that backslashes need to be escaped because they are passed as strings to Swift's Regex framework. Forward slashes do not need to be escaped.

A simpler example just checks if there is a subscribe URL for Micro.blog without setting a variable:

```json
"html": [
	{
		"element": "link",
		"check": "rel",
		"match": "subscribe",
		"use": "href",
		"extract": "https://micro.blog/users/follow"
	}
]
```

If there are multiple rules, they must all pass. For example, the first rule below checks if there is an Open Graph `og:site_name` meta property that contains the word "Mastodon". If it does, there is another check for the `og:url` property where the `site` variable can be extracted:

```json
"html": [
	{
		"element": "meta",
		"check": "property",
		"match": "og:site_name",
		"use": "content",
		"extract": "/.*Mastodon.*/"
	},
	{
		"element": "meta",
		"check": "property",
		"match": "og:url",
		"use": "content",
		"extract": "/(https://[^/]+)/",
		"variable": "site"
	}
]
```

Any HTML element can be used. For example the connector for podcasts uses these two rules:

```json
{
	"element": "link",
	"check": "type",
	"match": "application/rss+xml",
	"use": "href",
	"variable": "site"
},
{
	"element": "a",
	"check": "href",
	"match": "///(?:podcasts.apple.com|apple.co)//"
}
```

The first rule checks that there is an RSS feed while the second rule checks if there is a link on the page to Apple's podcast directory.

## xml

If none of the rules above apply, the content can be checked for XML elements. There are two parameters, both of which are required. This example will identify podcast feeds:

```json
"xml": [
	{
		"root": "rss",
		"with": "itunes:image"
	}
]
```

The `root` element must be the first element in the content. In the example above, it guarantees that the XML data is in the RSS format.

The `with` element must occur at least once in the content. The example above checks that the RSS feed contains an iTunes image, which is required for a podcast.

## json

If none of the rules above apply, the content can be checked for JSON keys. There are two parameters, both of which are required. This example identifies the JSON Feed format:

```json
"json": [
	{
		"key": "version",
		"value": "https://jsonfeed.org/version/1.1"
	}
]
```

The `key` must be a top-level key in the JSON content. The example ensures that the JSON dictionary has a `version` key with the correct `value`.
