# HTML Content

## How Tapestry uses HTML

Tapestry's `Item` object uses HTML as its native content type. The `body` property will be used in two ways:

  1. To preview the post in the main timeline. A limited number of words (100-200) in the content will be displayed as formatted text. HTML tags can be used to influence this formatting (e.g. `<strong>` making bold text). Any content that won't fit in the available space will end with "More...".
  2. The post's detail view will display the full HTML content with styling provided by Tapestry's current theme (e.g. dark vs. light). This content will be displayed as a web view.

Some HTML tags won't appear in the preview. Things like `<table>`, `<ul>`, or `<hr/>` will only appear in the detail view. Our hope is that for most use cases, this will be fine. It's rare to begin HTML with these kinds of tags, so previewing them is unnecessary. Additionally, the detail view will use a full WebKit rendering engine, so it can display any content not in the preview.

## HTML Preview Tags

In the first case, speed is of the essence. Timeline scrolling performance can only be achieved with a subset of HTML that is converted to formatted text. In this context, think of your content text more like Markdown formatting than full HTML formatting.

The following tags are supported:

  * `<p>` to start a paragraph.
  * `<strong>`, `<b>` for **strongly emphasized** text.
  * `<em>`, `<i>` for _emphasized_ text.
  * `<strike>`, `<s>` for ~~strikethrough~~ text.
  * `<a>` for linked text.
  * `<img>` for inline attachments (see below).
  * `<blockquote>` for quoted text.
  * `<br>` for a newline in the context of a paragraph. Ignored outside a paragraph.

For example, if your connector provides the following `body`:

```html
<p><b>Bold</b>, <i>italic</i>, <b><i>both</i></b>,<br/> and <a href="#">link</a>.</p>
```

As with all HTML, unclosed tags will provide unpredictable results. Close your tags.

## HTML Inline Attachments

Some attachments are easier to deal with as inline content. For example, a blog feed may contain several `<img>` tags that you want to see as images in the timeline.

As a part of the step to create the timeline preview, images can automatically be extracted from the HTML content and assigned as `MediaAttachment` objects.

For example, if your connector provides this content:

```html
<p>In this blog post, I will explain our watermark.</p>
<p><img src="https://iconfactory.com/images-v8/if_watermark.png"/></p>
```

If no media attachments have been added to an item, Tapestry will create them automatically from inline images and show this in the media viewer.

If the `<img>` tag includes an `alt` attribute, that text will be included in the attachment and used to improve accessibility in the timeline.

A `LinkAttachment` can also be created automatically. Tapestry will check the first link in the first paragraph and show the preview card in the timeline if the link contains Open Graph information.

This behavior can be disabled with `"provides_attachments": true` in `plugin-config.json`. The Mastodon connector is an example of where this is used because its API provides attachments directly in the payload.
