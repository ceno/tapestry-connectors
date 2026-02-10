# MediaAttachment

`Item`s can also have media attachments. Photos, videos, and audio are commonly available from APIs and other data sources, and this is how you get them into the timeline. They will be displayed under the HTML content.

```javascript
const attachment = MediaAttachment.createWithUrl(url);
attachment.mimeType = "image/gif";
attachment.text = "Yet another cat on the Internet.";
attachment.aspectSize = {width: 300, height: 400};
attachment.focalPoint = {x: 0, y: 0};

item.attachments = [attachment];
```

## Supported Image Formats

  * PNG (Portable Network Graphic) - .png
  * TIFF (Tagged Image File Format) - .tiff or .tif
  * JPEG (Joint Photographic Experts Group) - .jpeg or .jpg
  * GIF (Graphic Interchange Format) - .gif
  * BMP (Windows Bitmap Format) - .bmp or .BMPf
  * Windows Icon - .ico
  * Windows Cursor - .cur
  * XWindow bitmap - .xbm

## Supported Audio and Video Formats

  * AAC - .aac
  * AIFF - .aiff
  * AIFF Compressed - aifc
  * AVI - .avi
  * Audio Codec 3 (Dolby) - ac3
  * MPEG-4 Audio and Video - .mp4
  * MPEG-2 Video - .m2v
  * MPEG-2 Transport Stream - .ts
  * MPEG-1 Video - .mpg
  * MPEG-1 Audio Layer 2 - .mp2
  * MPEG-1 Audio Layer 3 - .mp3
  * Unix Audio - .au
  * 3GPP Container - .3gp, .3g2

An HLS playlist (.m3u8) should be specified explicitly as "video" or "audio" since Tapestry has no mechanism to examine the contents of the playlist.

## url: String (required)

A string containing the URL for the media on the Internet. A Base64 encoded data URL can be used, if needed.

## thumbnail: String

A string containing the URL for a lower resolution copy of the media. This is assumed to be an image file.

## mimeType: String

A string that lets Tapestry know what kind of media is being attached. Currently supported types are "image", "video", and "audio". A subtype, such as "jpeg", "png", or "gif" can be supplied, but does not affect how the media is displayed.

If this value isn't provided, the file name extension for `url` will be used. If there is no file extension, "image" will be assumed.

Note that playlists, such as .m3u8, will be assumed to be audio (based upon the file extension). If the playlist contains video, set the `mimeType` explicitly to "video/mp4".

## blurhash: String

A string that provides a placeholder image.

## text: String

A string that describes the media (for accessibility).

## aspectSize: Object

An object with `width` and `height` properties. The values are used to optimize the media placement in the timeline.

## focalPoint: Object

An object with `x` and `y` properties. The values are used to center media in the timeline. If no values are specified, the center at (0, 0) is assumed.
