# Item

`Item` objects are used to populate a timeline in the app. Items can be either posts or articles. You create one with:

```javascript
const uri = "https://example.com/unique/path/to/content";
const date = new Date();
const item = Item.createWithUriDate(uri, date);
item.title = "Hello.";
item.body = "<p>This is <em>a contrived</em> example, but <b>so what?</b></p>";
```

## uri: String (required)

A unique URI for the item on the Internet. Used to show details in a browser (assuming the URI is a valid HTTP URL).

## date: Date (required)

The date and time when the post was created.

## title: String

The title.

## body: String

Text with HTML formatting that will be displayed for the post. See [html-content.md](../html-content.md) for how this content and its formatting is used.

## contentWarning: String

Adds a content warning to the item and blurs any attachments.

## author: Identity

The creator of the content. See [Identity.md](Identity.md).

## attachments: Array of MediaAttachment and LinkAttachment and Item and PollAttachment

Media, link, poll, and quoted item attachments for the content. See [MediaAttachment.md](MediaAttachment.md), [LinkAttachment.md](LinkAttachment.md), and [PollAttachment.md](PollAttachment.md).

As of 1.3, the `attachments` array can also include ordinary `Item` instances to achieve a "quoted post" presentation when needed.

> **Note:** If the `provides_attachments` configuration parameter is not set or false, attachments will be generated automatically using the elements of the `body` HTML. If no other media attachments in the item have been set, inline images and videos will be used to create media attachments automatically. Additionally, the first link in the first paragraph will be checked for a link attachment. See [html-content.md](../html-content.md) for more information.

> **Compatibility:** Item and PollAttachment attachments are only supported in Tapestry 1.3 or higher and will be ignored by older versions.

## shortcodes: Dictionary

This property contains a dictionary of name and URL pairs. Shortcodes are used to process any content in the `Item` or the author `Identity`. Text that uses the `:shortcode:` convention will be replaced by an image at display. For example:

```javascript
item.body = "<p>THE :ONE: AND ONLY :CHOCK: WAS HEAR</p>";
item.shortcodes = { "ONE": "https://example.com/one.jpg", "CHOCK": "https://chocklock.com/favicon.ico" };
```

Shortcode tokens must not contain spaces or additional colons: using `:my fancy code:` or `:what:the:hell:` is invalid and will be ignored.
