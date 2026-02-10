# Utility Functions

The following functions are available to the script to help it perform the actions listed in [interface.md](interface.md).

## sendRequest(url, method, parameters, extraHeaders, fullResponse) → Promise

Sends a request. If configured, a bearer token will be included with the request automatically.

  * url: `String` with the endpoint that will be retrieved.
  * method: `String` with the HTTP method for the request (default is "GET").
  * parameters: `String` with the parameters for HTML body of "POST" or "PUT" request. For example: "foo=1&bar=something" (default is null).
  * extraHeaders: `Dictionary` of `String` key/value pairs. They will be added to the request (default is null for no extra headers).
  * fullResponse: `Boolean` which causes response to include status code, headers, and body text.

Returns a `Promise` with a resolve handler with a String parameter and a reject handler with an Error parameter.

> **Note:** The `url` is assumed to be properly encoded. Use JavaScript's `encodeURI`, if needed.

For the "HEAD" method, the string result contains a JSON dictionary containing the HTTP status code, the response headers, and the URL that was loaded (which may be different than the request due to redirects):

```json
{
	"status": 404,
	"headers": {
		"last-modified": "Thu, 02 Mar 2023 21:46:29 GMT",
		"content-length": "15287",
		"...": "..."
	},
	"url": "https://example.com/redirect"
}
```

All successful requests return a string. Typically this will be HTML text or a JSON payload created from the response body. Regular expressions can be used on HTML and `JSON.parse` can be used to build queryable object. For XML text, `xmlParse()` can convert it to an object. In all cases, the data extracted will be returned to the Tapestry app.

The `parameters` string and values in `extraHeaders` can contain patterns that will be replaced with values managed by the Tapestry app:

  * `__ACCESS_TOKEN__` The access token returned when authenticating with OAuth or JWT.
  * `__CLIENT_ID__` The client ID used to identify the connector with the API.

For example, if you need to "POST" the client ID, you would use "client=\_\_CLIENT\_ID\_\_&text=foo" for the `parameters`. If you need this information in a header, use:

```javascript
let extraHeaders = { "X-Client-Id": "__CLIENT_ID__" };
sendRequest(url, "GET", null, extraHeaders)
```

The `fullResponse` flag can be set to `true`. In this mode, the text response is a JSON dictionary that contains all the results from the request:

```json
{
	"status": 200,
	"headers": {
		"last-modified": "Thu, 02 Mar 2023 21:46:29 GMT",
		"content-length": "15287",
		"...": "..."
	},
	"url": "https://example.com/redirect",
	"body": "<!DOCTYPE html> ..."
}
```

### Example

A Mastodon user's identity is determined by sending a request to verify credentials:

```javascript
function verify() {
	sendRequest(site + "/api/v1/accounts/verify_credentials")
	.then((text) => {
		const jsonObject = JSON.parse(text);
		
		const displayName = "@" + jsonObject["username"];
		const icon = jsonObject["avatar"];
		
		const verification = {
			displayName: displayName,
			icon: icon
		}
		processVerification(verification);
	})
	.catch((requestError) => {
		processError(requestError);
	});
}
```

> **Note:** The JavaScript code doesn't have access to the OAuth access token (for security, no authentication information is exposed to the connector). If an access token is needed in a list of `parameters`, use `__ACCESS_TOKEN__` — it will be substituted before the request is sent to the endpoint.

## sendConditionalRequest(url, method, parameters, extraHeaders, fullResponse) → Promise

This performs an [HTTP conditional request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests).

The behavior is nearly identical to `sendRequest()` with one very important difference: If `fullResponse` is false or unspecified and the server responds with an `HTTP 304 Not Modified` response, the value returned by the promise will be `null`.

The purpose of this is to make it faster to check when content has changed since the last time it was requested. Internally the request's `url` is used as a key to record the modified date and/or etag as returned by the server. That information is then automatically added to the headers of your next conditional request for that same `url` so the server can know how to respond.

For feed-like data sources (such as RSS), this often results in a very significant speedup because it avoids re-downloading and re-importing unchanged content.

> **Note:** Not all web servers are correctly configured to support conditional requests. If the server doesn't send the required headers or otherwise ignores them, this function will fallback to behaving identically to `sendRequest()`.

> **Compatibility:** Requires `minimum_app_version="1.3"` or higher.

## processResults(results, isComplete)

Sends any data that's retrieved to the Tapestry app for display.

  * results: `Array` with `Item` objects.
  * isComplete: `Boolean` with a flag that indicates that result collection is complete and can be displayed in the app timeline (default is true).

After returning a true value for `isComplete` any further results will be ignored. If you have multiple async `sendRequest` in your connector, you'll need to have some kind of reference counter to know when to set the flag to true. See the [Mastodon connector](https://github.com/TheIconfactory/Tapestry/blob/main/Plugins/org.joinmastodon/plugin.js) for an example of how to do this.

## processError(error)

Sends any error to the Tapestry app for display.

  * error: `Error` which indicates what went wrong. Will be displayed in the user interface.

## processVerification(verification)

Sets the parameters for the site and service.

  * verification: dictionary `Object` or `String`.

The dictionary can contain the following:

  * displayName: `String` that will be used to name the feed. For example, a RSS feed name or a Mastodon account.
  * icon: `String` for an image URL that will be presented alongside the display name.
  * baseUrl: `String` that will be used to resolve relative URLs. Anything other than the protocol and hostname will be discarded.

When a string is returned, it will be used as a `displayName` with an empty `baseUrl` and default `icon`.

> **Note:** A `baseUrl` is typically used for feeds where the site is "feed.example.com" but images and other resources are loaded from "example.com".

## xmlParse(text) → (Object | Promise)

  * text: `String` is the text representation of the XML data.

If `minimum_app_version` is `1.3` or higher, this returns a `Promise` which asynchronously returns an `Object` or raises an error.

If `minimum_app_version` is unspecified or below `1.3`, this synchronously returns an `Object` or throws an error.

> **Note:** Do not assume that the order of the keys in the object dictionaries will be the same as they occurred in the XML. No order is preserved during processing (as is the case with JSON parsing).

To deal with the differences between XML and JavaScript objects (JSON), some processing is done on the XML.

If the XML has multiple nodes with the same name, they are put into an array. For example, the following XML:

```xml
<root>
	<metadata>Example</metadata>
	<entry>
		<title>First</title>
	</entry>
	<entry>
		<title>Second</title>
	</entry>
</root>
```

Will generate:

```json
{
	"root": {
		"metadata": "Example",
		"entry": [
			{
				"title": "First"
			},
			{
				"title": "Second"
			}
		]
	}
}
```

When evaluating the result, you can use JavaScript's `instanceof` operator. Using the example above, `object.root.entry instanceof Array` will return true, while `object.root instanceof Array` will return false. You can also use `Object`'s `.getOwnPropertyNames(object)` to get a list of properties generated for the node: in the example above, the properties of `object.root` are `[metadata,entry]`.

A node's attributes are stored in a sibling object with a "$attrs" key. The dollar sign was chosen because it's an invalid XML node name, but is a valid JavaScript property name. This makes it easy to access with a path like `object.root.node$attrs`.

For example, this XML:

```xml
<root>
	<node first="1" second="2" third="3">value</node>
</root>
```

Produces:

```json
{
	"root" : {
		"node" : "value",
		"node$attrs" : {
			"first" : "1",
			"second" : "2",
			"third" : "3"
		}
	}
}
```

Note that these two processing steps can be combined in some cases. An example is multiple link nodes with nothing but attributes:

```xml
<root>
	<link first="abc" second="def" />
	<link first="hij" second="klm" />
</root>
```

Will only produce attribute dictionaries:

```json
{
	"root" : {
		"link$attrs" : [
			{
				"first" : "abc",
				"second" : "def"
			},
			{
				"first" : "hij",
				"second" : "klm"
			}
		]
	}
}
```

Note also that text that's not a part of a node will be ignored. For example:

```xml
<root>
	text
	<node>value</node>
</root>
```

Results:

```json
{
	"root" : {
		"node" : "value"
	}
}
```

XML elements with type "xhtml" will generate the node and its children as described above. It will also provide a text representation of those nodes in a "$xhtml" sibling object. This is mainly a convenience for parsing XHTML content elements in Atom RSS feeds:

```javascript
if (entry.content$attrs["type"] == "xhtml") {
	content = entry.content$xhtml;
}
else {
	content = entry.content;
}
```

Finally, not all XML nodes will be accessible with an object property path. An XML node with a namespace will be represented as `namespace:key` and that's an invalid identifier in JavaScript. You will need to access these values using the index operator instead: `object["namespace:key"]`.

This functionality should be enough to parse XML generated from hierarchical data, such as an RSS feed generated by a WordPress database of posts.

> **Compatibility:** Returns a `Promise` if `minimum_app_version="1.3"` or higher.

## plistParse(text) → (Object | Promise)

  * text: `String` is the text representation of the property list data formatted as XML.

If `minimum_app_version` is `1.3` or higher, this returns a `Promise` which asynchronously returns an `Object` or raises an error.

If `minimum_app_version` is unspecified or below `1.3`, this synchronously returns an `Object` or throws an error.

Note that old style property lists or JSON property lists are not supported.

> **Compatibility:** Returns a `Promise` if `minimum_app_version="1.3"` or higher.

## extractProperties(text) → (Object | Promise)

  * text: `String` is HTML content with `<meta>` properties (such as Open Graph).

If `minimum_app_version` is `1.3` or higher, this returns a `Promise` which asynchronously returns an `Object` or raises an error.

If `minimum_app_version` is unspecified or below `1.3`, this synchronously returns an `Object` or throws an error.

The `Object` representation contains the HTML's properties. These values can be used to generate link previews or enhance the content without scraping the markup.

> **Compatibility:** Returns a `Promise` if `minimum_app_version="1.3"` or higher.

## lookupIcon(url) → Promise

  * url: `String` with a path to an HTML page

Returns a `Promise` with a resolve handler that includes a `String` parameter with a path to an icon for the page. If no icon can be found, a `null` value is returned.

## setItem(key, value)

  * key: `String` a key for value being stored.
  * value: `String` to be saved in local storage.

Items can be removed from local storage by passing a `null` value. The amount of local storage is limited to 100,000 total characters and any items set beyond that threshold will be ignored.

## getItem(key) → String

  * key: `String` a key for value that was stored.

Returns a `String` that was saved in local storage. If no value was stored, `null` is returned.

## clearItems()

All items in local storage are removed.

## actionComplete(results, error)

Indicates that the action has been performed. Must be called.

  * results: An `Item` or Array of `Item`s that were updated. A null value indicates there were no results.
  * error: If not null, the `Error` indicates what went wrong and will be displayed in the user interface.

See [actions.md](../configuration/actions.md) for more information on how to complete actions.

> **Compatibility:** Returning an array of `Item`s requires `minimum_app_version="1.4"` or higher.

## require(resourceName) → Value | Object | String | false

  * resourceName: `String` with the name of a text resource to load.

The connector folder can contain a folder named "resources". The files in that folder are loaded using this function.

The resource's file name extension determines what type of data is returned:

  * **".js"** causes the contents of the file to be evaluated and any resulting value is returned. This can be used to define functions that are used by `plugin.js` and allow you to organize and share your code. Any errors during evaluation will throw an exception that's displayed in the user interface.
  * **".json"** parses the contents of the file and returns the resulting `Object`. If no object can be parsed, `false` is returned.
  * Any other extension, including **".txt"** returns the contents of the file as a UTF-8 `String`.
  * If the file contains any other kind of data, such as an image, `false` is returned.

Files in resources folder can be symbolic links (not aliases) to other files in the folder that contains the connectors. This way the connectors "com.example.one" and "com.example.two" can share common code in a single file. When you save a connector, the symbolic links are resolved and stored individually in the resulting .tapestry file.

If you are loading functions, errors can be detected with a `false` return value:

```javascript
if (require('utility.js') === false) {
	throw new Error("Failed to load utility.js");
}
```

This can be extended to ensure that `String` and `Object` are loaded correctly.

```javascript
let template = require('template.txt');
if (template === false) {
	throw new Error("Failed to load template")
}
else {
	console.log(`template = ${template}`)
}
```

If you have used Node.js's module loading, the approach above is very similar. Note that there is no need to export functions from the .js file that is being loaded: all functions and variables in the file are exported.

## raiseCondition(condition, title, description)

Raises a persistent error condition that will be presented as a fatal error to the user:

  * type: A `String` with the type of condition: either "authorize" or "disable".
  * title: A `String` with a short description of the condition.
  * message: A `String` with a longer description.

When "authorize" is used, the authorization tokens for the feed will be removed. A prominent user interface will prompt the user to reauthorize the feed.

When "disable" is used, the condition is displayed prominently and the user will be given an option to disable the feed.

Any other `type` is ignored.
