# PollAttachment

Used for attaching information about a poll to an `Item`.

```javascript
const attachment = PollAttachment.create();
attachment.options = [ PollOption.create("Option 1", 16), PollOption.create("Option 2", 26) ];
attachment.endDate = new Date();

item.attachments = [attachment];
```

## options: Array of PollOptions (required)

An array of `PollOption` objects for each option in the poll.

## endDate: Date (optional)

An optional date that the poll ends. If not specified, Tapestry renders the poll without showing a countdown time label.

## multipleChoice: Bool (default false)

Set to `true` if the poll allows multiple choices or not.

> **Compatibility:** Requires `minimum_app_version="1.3"` or higher.

---

# PollOption

Used to define an option for a `PollAttachment`.

```javascript
const a = PollOption.create("Zero votes.", 0);
const b = PollOption.create("This has 16 votes.", 16);
const c = PollOption.create("Unspecified votes.");
const poll = PollAttachment.create([a, b, c]);
```

## title: String (required)

## votes: Number (optional)

If `votes` is left unspecified on one or more options in a `PollAttachment`, Tapestry will not show vote totals or percentages.

> **Compatibility:** Requires `minimum_app_version="1.3"` or higher.
