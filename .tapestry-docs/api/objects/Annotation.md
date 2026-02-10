# Annotation

An `Item` can have annotations that indicates how the content arrived in the timeline. It can be used for boosts, replies, reposts, reblogs, or any other type of reference.

```javascript
const text = "CHOCK STAR";
const annotation = Annotation.createWithText(text);
annotation.icon = "https://chocklock.com/favicon.ico";
annotation.uri = "https://chocklock.com";

item.annotations = [annotation];
```

## text: String (required)

The text for the annotation. It can be anything, but will be most useful to the user as something like "@chockenberry Boosted".

## icon: String

A string containing a URL for the annotation's icon. If no icon is specified only the text will be displayed in the timeline.

## uri: String

A URI with more information about the annotation. For things like boosts/reposts/reblogs that are done by an account the user follows, a link to the account listed in the annotation would be appropriate.
