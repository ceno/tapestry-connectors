# Interface Functions

The Tapestry app will call the following functions in `plugin.js` when it needs the script to read or write data. If no implementation is provided, no action will be performed. For example, some sources will not need to `verify()` themselves.

All actions are performed asynchronously (using one or more JavaScript Promise objects). An action indicates that it has completed using the `processResults`, `processError`, and `processVerification` functions specified in [utility.md](utility.md).

## verify()

Determines if a site is reachable and gathers properties for the feed. After `processVerification` is called a feed can be saved by a user.

This function will only be called if `needs_verification` is set to true in the connector's configuration.

The properties returned can be user visible or used internally. An example of the former case is a display name will be used identify the feed. The latter case is a base URL that will be used to handle relative paths in the feed.

To return the results of verification, you must call `processVerification()`.

When you call `processVerification()` you can supply an object with these properties (all are optional):

  * displayName: `String` with a suggested name for a feed (e.g. an account name, blog name, etc.).
  * icon: `String` with a URL to an image that can be used as a graphic attached to the feed (e.g. an avatar).
  * baseUrl: `String` with a URL prefix for relative paths.
  * accountIdentity: `Identity` object that represents the logged in account for the feed.

For authenticated feeds (such as social media accounts), we suggest supplying an `accountIdentity` object (created with `Identity.create()`) that is configured with the user's display name, username, and avatar.

When a Tapestry user adds multiple feeds for the same connector that requires authentication (such as multiple Mastodon accounts), the information in `accountIdentity` can help the user tell the items from each feed apart in their timelines. For feeds without any associated user authentication, an `accountIdentity` will have little effect and isn't necessary.

If `icon` or `displayName` are omitted, then the ones supplied by `accountIdentity` will be used instead, if possible.

## load()

Your script should implement this function to load any new data and return it to the app with `processResults` or `processError`. Variables can be used to determine what to load. For example, whether to include mentions on Mastodon or not.

## performAction(actionId, actionValue, item)

Tapestry calls this function when an action needs to be performed by the connector.

  * actionId: A `String` with the action id
  * actionValue: The `String` value that was assigned to the action.
  * item: the `Item` instance that the action is being requested for.

After performing the action, call `actionComplete()` with the results.

> **Note:** Only one action per feed is allowed to be running at a time.

See [actions.md](../configuration/actions.md) and `actionComplete()` in [utility.md](utility.md) for more information on how to define and perform actions.
