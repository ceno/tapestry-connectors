# actions.json

This file defines actions that can alter items supplied by a connector. An action is defined and referenced by `id`, however the `name` and `icon` are displayed in the Tapestry user interface. The `icon` can be any SF Symbol name or one of Tapestry's built-in symbols (listed below).

As of Tapestry 1.4, actions can also have an optional `role` that further determines where the action is rendered in the UI, assumptions about the action's return values, and how it is expected to behave. (See roles listed below.)

By default, actions are displayed as buttons on items in the timeline and/or in the item's overflow menu.

The `actions.json` file must define all possible actions, however when displaying an individual item in the timeline, only the actions attached to that item will actually be presented to the user.

Actions are displayed or preferred in the order they are defined in the `actions.json` file.

```json
{
	"items": [
		{
			"id": "favorite",
			"name": "Add Favorite",
			"icon": "heart.fill"
		},
		{
			"id": "unfavorite",
			"name": "Remove Favorite",
			"icon": "heart"
		},
		{
			"id": "thread",
			"name": "Thread",
			"icon": "bubble",
			"role": "context"
		}
	]
}
```

When returning an `Item` in `processResults()` you can include a dictionary of `actions` that can be applied to that item. Each action has an `id` and a string value that will be passed to the action when it's performed.

For example, an action that marks an item as a favorite, might need an identifier:

```javascript
item.actions = { favorite: "123456" };
```

It's also likely that structured data will be needed, so JSON can be used as an action value:

```javascript
item.actions = { like: `{ "uri": "at:..." }`, repost: `{ "uri": "at:..." }` };
```

When an item has one or more actions, a menu or one or more action buttons will be displayed in the app. When a user selects one of the actions the `performAction` function is called with the action `id`, `value`, and `item`.

It is the connector's responsibility to manage the list of actions as the state of the item changes. For example, if an action to "favorite" is performed, the action would be removed from the item and replaced with "unfavorite" action with a different icon and/or name so the user can tell that the state has changed.

The modified item is returned to Tapestry using `actionComplete`. If the action cannot be performed, an `Error` should be returned and will be displayed to the user.

### Example

This example performs "favorite" and "unfavorite" on an item. Note that any part of the item can be modified: the body in this example, but it could be annotations or attachments as well. The example also shows how the state of the item is managed using `item.actions`:

```javascript
function performAction(actionId, actionValue, item) {
	console.log(`actionId = ${actionId}`);
	if (actionId == "favorite") {
		let content = item.body;
		content += "<p>Faved!</p>";
		item.body = content;
		
		let actions = item.actions;
		delete actions["favorite"];
		actions["unfavorite"] = "boo";
		item.actions = actions;
		actionComplete(item, null);
	}
	else if (actionId == "unfavorite") {
		let content = item.body;
		content += "<p><strong>UNFAVED!</strong></p>";
		item.body = content;

		let actions = item.actions;
		delete actions["unfavorite"];
		actions["favorite"] = "yay";
		item.actions = actions;
		actionComplete(item, null);
	}
	else if (actionId == "whoops") {
		let error = new Error("That wasn't supposed to happen!")
		actionComplete(null, error);
	}
}
```

## Action Roles

The following roles are supported for actions.

By default, actions have a `null` role which means they don't get any special treatment and are generally displayed as buttons directly on the item in the timeline or, if there are too many, as options in the item's overflow menu.

**`"context"`**

A context action is expected to return additional context about the item such as a conversation thread. To display a conversation thread, for example, call `actionComplete()` with an array of `Item`s. The display order is preserved (Tapestry will not re-sort these items by date). It is your responsibility to return the original item in the resulting array in the position you want it to be displayed otherwise it will not be included in the resulting timeline view. Context actions appear in the swipe menu for items in the timeline and also replace the default "Details" button. (Added in Tapestry 1.4.)

## Built-in Symbols

The following names can be used for the `icon` of an action:

tapestry.arrow.right.circle.fill tapestry.bluesky tapestry.bookmark.fill tapestry.bookmark tapestry.boost.fill tapestry.boost tapestry.counter.arrow tapestry.crosstalk tapestry.hashtag tapestry.jump.back tapestry.jump.to.marker tapestry.jump.to.top tapestry.mark.fill tapestry.mark tapestry.mastodon tapestry.microblog tapestry.muffled tapestry.open.original tapestry.person.2 tapestry.person tapestry.reddit tapestry.sparkles.premium tapestry.star.fill tapestry.star tapestry.timeline.collapsed tapestry.timeline.expanded tapestry.timeline.mini tapestry.tumblr tapestry.view.details tapestry.youtube
