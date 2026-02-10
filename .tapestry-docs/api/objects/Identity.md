# Identity

An `Item` can have an author that indicates how the content was created. It can be a person, a woman, a man, a camera, or a TV. The information is used to present an avatar and display name in the timeline. Feed verification can also optionally return an `accountIdentity`.

```javascript
const name = "CHOCK OF THE LOCK";
const identity = Identity.createWithName(name);
identity.uri = "https://chocklock.com";
identity.avatar = "https://chocklock.com/favicon.ico";

item.author = identity;
```

An `Identity` instance can also be constructed with the `create()` function which takes each of the properties in order:

```javascript
item.author = Identity.create("CHOCK OF THE LOCK", null /* username */, "https://chocklock.com/favicon.ico", "https://chocklock.com");
```

## name: String (required)

The name of the creator. Can be an account's full name, a bot name, or anything to identify the data and source.

## username: String

The name of the creator. Can be an account's full name, a bot name, or anything to identify the data and source.

## avatar: String

A string containing the URL for the creator's avatar on the Internet. A Base64 encoded data URL can be used, if needed. If no avatar is specified a generic image will be displayed in the timeline.

## uri: String

A unique URI for the creator on the Internet. Can be an individual's account page, bot, or other type of creator. Will be used to show details for the creator if the URI can be converted to a browsable URL.
