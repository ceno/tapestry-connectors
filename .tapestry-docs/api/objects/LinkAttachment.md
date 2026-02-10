# LinkAttachment

## url: String (required)

A string containing the URL for the link on the Internet.

## type: String

The type of link, typically an Open Graph [og:type](https://ogp.me/#types).

## title: String

The title for the link, typically an Open Graph [og:title](https://ogp.me/#metadata).

## subtitle: String aka "description"

The subtitle for the link, typically an Open Graph [og:description](https://ogp.me/#optional).

## siteName: String

The site name for the link, typically an Open Graph [og:site_name](https://ogp.me/#optional).

## authorName: String

The author's name, typically as [HTML author metadata](https://www.w3.org/TR/2011/WD-html5-author-20110809/the-meta-element.html#meta-author).

## authorProfile: String

A URL for the author, typically from [fediverse:creator](https://blog.joinmastodon.org/2024/07/highlighting-journalism-on-mastodon/).

## image: String

An image for the link, typically the Open Graph [og:image](https://ogp.me/#metadata).

## blurhash: String

A string that provides a placeholder image.

## aspectSize: Object

An object with `width` and `height` properties, typically from Open Graph [og:image:width](https://ogp.me/#structured) and [og:image:height](https://ogp.me/#structured).
