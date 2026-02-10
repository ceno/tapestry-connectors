// Regression tests for specific bug reports
// These tests verify that specific issues have been fixed

require('./mocks/tapestry');

const { xload } = require('../x.feed/resources/x-shared');

// Serialize an Item to the Tapestry text format for comparison
function serializeItem(item, feedId = 'x.feed') {
    const lines = [];
    
    // id
    lines.push(`id = ${feedId}:${item.uri}`);
    lines.push('');
    
    // feedId
    lines.push(`feedId = ${feedId}`);
    lines.push('');
    
    // uri
    lines.push(`uri = ${item.uri}`);
    lines.push('');
    
    // date
    const date = item.date;
    const dateStr = date ? formatDate(date) : 'nil';
    lines.push(`date = ${dateStr}`);
    lines.push(`updatedDate = nil`);
    lines.push('');
    
    // markedDate
    lines.push(`markedDate = nil`);
    lines.push('');
    
    // rules
    lines.push(`rules = []`);
    lines.push('');
    
    // title
    lines.push(`title = ${item.title ?? 'nil'}`);
    lines.push('');
    
    // contentWarning
    lines.push(`contentWarning = nil`);
    lines.push('');
    
    // body
    lines.push(`body:`);
    lines.push(item.body ?? '');
    lines.push('');
    
    // bodyPreview - extract from body HTML
    if (item.body) {
        lines.push(`bodyPreview:`);
        lines.push(generateBodyPreview(item.body));
        lines.push('');
    }
    
    // author
    if (item.author) {
        lines.push(`author:`);
        lines.push(`  name = ${item.author.name}`);
        lines.push(`  username = ${item.author.username}`);
        lines.push(`  uri = ${item.author.uri}`);
        lines.push(`  avatar = ${item.author.avatar}`);
    }
    lines.push('');
    
    // annotations (e.g., retweet info)
    if (item.annotations && item.annotations.length > 0) {
        for (const annotation of item.annotations) {
            lines.push(`annotation:`);
            lines.push(`  text = ${annotation.text ?? 'nil'}`);
            lines.push(`  icon = ${annotation.icon ?? 'nil'}`);
            lines.push(`  uri = ${annotation.uri ?? 'nil'}`);
            lines.push('');
        }
    }
    
    // attachments
    if (item.attachments && item.attachments.length > 0) {
        for (const attachment of item.attachments) {
            if (attachment._type === 'link') {
                // Link attachment
                lines.push(`link attachment:`);
                lines.push(`  url = ${attachment.url}`);
                lines.push(`  title = ${attachment.title ?? 'nil'}`);
                lines.push(`  subtitle = nil`);
                lines.push(`  authorName = nil`);
                lines.push(`  authorProfile = nil`);
                lines.push(`  image = ${attachment.image ?? 'nil'}`);
                lines.push(`  blurhash = nil`);
                lines.push(`  aspectSize = nil`);
            } else {
                // Media attachment
                lines.push(`media attachment:`);
                lines.push(`  url = ${attachment.url}`);
                // Determine type from mimeType or URL extension
                const type = getAttachmentType(attachment);
                lines.push(`  type = ${type}`);
                lines.push(`  thumbnail = nil`);
                lines.push(`  blurhash = nil`);
                lines.push(`  aspectSize = nil`);
                lines.push(`  focalPoint = nil`);
                lines.push(`  text = nil`);
                lines.push(`  extractedAutomatically = false`);
            }
        }
    }
    
    return lines.join('\n');
}

// Generate bodyPreview from HTML body (simplified Tapestry format)
function generateBodyPreview(html) {
    // Very simplified: extract text and links
    // This matches the format: text { } @mention { NSLink = url } text { }
    
    let remaining = html;
    
    // Remove <img> tags for preview
    remaining = remaining.replace(/<img[^>]*>/g, '');
    
    // Process <a> tags - handle nested content by using a non-greedy match
    const result = [];
    const aTagRegex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = aTagRegex.exec(remaining)) !== null) {
        // Text before the link
        const textBefore = remaining.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
        if (textBefore) {
            result.push(`${textBefore} {\n}`);
        }
        
        // The link - extract text content, removing nested tags
        const url = match[1];
        const innerHtml = match[2];
        const text = innerHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (text) {
            result.push(`${text} {\n\tNSLink = ${url}\n}`);
        }
        
        lastIndex = match.index + match[0].length;
    }
    
    // Text after last link
    const textAfter = remaining.slice(lastIndex).replace(/<[^>]+>/g, '');
    if (textAfter.trim()) {
        result.push(`${textAfter} {\n}`);
    }
    
    // Join and fix formatting
    let output = result.join('\n');
    // Fix: "text {\n}" followed by newline should not have space before {
    output = output.replace(/\n (\{)/g, ' $1');
    
    return output;
}

function getAttachmentType(attachment) {
    const url = attachment.url || '';
    if (url.endsWith('.png')) return 'public.png - image';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'public.jpeg - image';
    if (url.endsWith('.gif')) return 'public.gif - image';
    if (attachment.mimeType === 'image') return 'public.png - image';
    return 'unknown';
}

function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0000`;
}

describe('Bug Report Regressions', () => {
    test('pierceboggan/2017018239759298807 - image not extracted from description', () => {
        // The item as seen by Tapestry (JSON representation)
        const item = {
          "title": "Coming soon to a @code near you 👀",
          "guid": "2017018239759298807",
          "guid$attrs": {
            "isPermaLink": "false"
          },
          "dc:creator": "@pierceboggan",
          "description": "<p>Coming soon to a <a href=\"https://rss.xcancel.com/code\" title=\"Visual Studio Code\">@code</a> near you 👀</p>\n<img src=\"https://pbs.twimg.com/media/G_3jZRJXEAAgZ9o.png\" style=\"max-width:250px;\" />",
          "pubDate": "Thu, 29 Jan 2026 23:33:17 GMT",
          "link": "https://rss.xcancel.com/pierceboggan/status/2017018239759298807#m"
        };

        // Wrap in full feed structure that xload expects
        const input = {
            rss: {
                channel: {
                    link: "https://rss.xcancel.com/pierceboggan",
                    title: "Pierce Boggan / @pierceboggan",
                    image: {
                        url: "https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg"
                    },
                    item: [item]
                }
            }
        };

        const expectedOutput = `id = x.feed:https://xcancel.com/pierceboggan/status/2017018239759298807#m

feedId = x.feed

uri = https://xcancel.com/pierceboggan/status/2017018239759298807#m

date = 2026-01-29 23:33:17 +0000
updatedDate = nil

markedDate = nil

rules = []

title = nil

contentWarning = nil

body:
<p>Coming soon to a <a href="https://xcancel.com/code" title="Visual Studio Code">@code</a> near you 👀</p>
<img src="https://pbs.twimg.com/media/G_3jZRJXEAAgZ9o.png" style="max-width:250px;" />

bodyPreview:
Coming soon to a  {
}
@code {
	NSLink = https://xcancel.com/code
}
 near you 👀 {
}

author:
  name = pierceboggan
  username = @pierceboggan
  uri = https://xcancel.com/pierceboggan
  avatar = https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg

media attachment:
  url = https://pbs.twimg.com/media/G_3jZRJXEAAgZ9o.png
  type = public.png - image
  thumbnail = nil
  blurhash = nil
  aspectSize = nil
  focalPoint = nil
  text = nil
  extractedAutomatically = false`;

        const results = xload(input);

        const result = results[0];
        const actualOutput = serializeItem(result);

        expect(actualOutput).toBe(expectedOutput);
    });

        test('pierceboggan/2017018239759298807 - video not extracted from description', () => {
        // The item as seen by Tapestry (JSON representation)
        const item = {
          "pubDate": "Fri, 30 Jan 2026 21:10:31 GMT",
          "description": "<p>New in <a href=\"https://rss.xcancel.com/code\" title=\"Visual Studio Code\">@code</a> Insiders: Interactive mermaid diagrams in Chat.<br>\n<br>\nZoom, pan, and iterate over mermaid diagrams, or open them in the editor when you need more room.<br>\n<br>\n<a href=\"https://rss.xcancel.com/mattbierner\" title=\"Matt Bierner 🪦\">@mattbierner</a> shows you how:</p>\n<a href=\"https://rss.xcancel.com/pierceboggan/status/2017344699498172651#m\">\n<br>Video<br>\n  <img src=\"https://pbs.twimg.com/amplify_video_thumb/2017344096675790848/img/VTrID7vZrJuUfz14.jpg\" style=\"max-width:250px;\" />\n</a>",
          "title": "New in @code Insiders: Interactive mermaid diagrams in Chat.\n\nZoom, pan, and iterate over mermaid diagrams, or open them in the editor when you need more room.\n\n@mattbierner shows you how:",
          "guid$attrs": {
            "isPermaLink": "false"
          },
          "link": "https://rss.xcancel.com/pierceboggan/status/2017344699498172651#m",
          "guid": "2017344699498172651",
          "dc:creator": "@pierceboggan"
        };

        // Wrap in full feed structure that xload expects
        const input = {
            rss: {
                channel: {
                    link: "https://rss.xcancel.com/pierceboggan",
                    title: "Pierce Boggan / @pierceboggan",
                    image: {
                        url: "https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg"
                    },
                    item: [item]
                }
            }
        };

        const expectedOutput = `id = x.feed:https://xcancel.com/pierceboggan/status/2017344699498172651#m

feedId = x.feed

uri = https://xcancel.com/pierceboggan/status/2017344699498172651#m

date = 2026-01-30 21:10:31 +0000
updatedDate = nil

markedDate = nil

rules = []

title = nil

contentWarning = nil

body:
<p>New in <a href="https://xcancel.com/code" title="Visual Studio Code">@code</a> Insiders: Interactive mermaid diagrams in Chat.<br>
<br>
Zoom, pan, and iterate over mermaid diagrams, or open them in the editor when you need more room.<br>
<br>
<a href="https://xcancel.com/mattbierner" title="Matt Bierner 🪦">@mattbierner</a> shows you how:</p>
<a href="https://xcancel.com/pierceboggan/status/2017344699498172651#m">
<br>Video<br>
  <img src="https://pbs.twimg.com/amplify_video_thumb/2017344096675790848/img/VTrID7vZrJuUfz14.jpg" style="max-width:250px;" />
</a>

bodyPreview:
New in  {
}
@code {
	NSLink = https://xcancel.com/code
}
 Insiders: Interactive mermaid diagrams in Chat.

Zoom, pan, and iterate over mermaid diagrams, or open them in the editor when you need more room.
 {
}
@mattbierner {
	NSLink = https://xcancel.com/mattbierner
}
 shows you how: {
}
Video {
	NSLink = https://xcancel.com/pierceboggan/status/2017344699498172651#m
}

author:
  name = pierceboggan
  username = @pierceboggan
  uri = https://xcancel.com/pierceboggan
  avatar = https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg

link attachment:
  url = https://xcancel.com/pierceboggan/status/2017344699498172651
  title = Video
  subtitle = nil
  authorName = nil
  authorProfile = nil
  image = https://pbs.twimg.com/amplify_video_thumb/2017344096675790848/img/VTrID7vZrJuUfz14.jpg
  blurhash = nil
  aspectSize = nil`;

        const results = xload(input);

        const result = results[0];
        const actualOutput = serializeItem(result);

        expect(actualOutput).toBe(expectedOutput);
    });

    test('retweet shows original author avatar via unavatar.io', () => {
        // RT by @pierceboggan of a tweet by @jaredpalmer
        // The original author should get an avatar from unavatar.io
        const item = {
          "description": "<p>Stacked Diffs on <a href=\"https://rss.xcancel.com/github\" title=\"GitHub\">@GitHub</a> will start rolling out to early design partners in an alpha next month. In the meantime, here's video of our progress so far: <br>\n<br>\n(h/t for <a href=\"https://rss.xcancel.com/georgebrock\" title=\"George Brocklehurst\">@georgebrock</a> + team for their awesome work)</p>\n<a href=\"https://rss.xcancel.com/jaredpalmer/status/2019817235163074881#m\">\n<br>Video<br>\n  <img src=\"https://pbs.twimg.com/amplify_video_thumb/2019816932434685952/img/dElESJBztW4jqsI4.jpg\" style=\"max-width:250px;\" />\n</a>",
          "dc:creator": "@jaredpalmer",
          "title": "RT by @pierceboggan: Stacked Diffs on @GitHub will start rolling out to early design partners in an alpha next month. In the meantime, here's video of our progress so far: \n\n(h/t for @georgebrock + team for their awesome work)",
          "link": "https://rss.xcancel.com/jaredpalmer/status/2019817235163074881#m",
          "guid$attrs": {
            "isPermaLink": "false"
          },
          "pubDate": "Fri, 06 Feb 2026 16:55:29 GMT",
          "guid": "2019817235163074881"
        };

        // Wrap in full feed structure that xload expects
        const input = {
            rss: {
                channel: {
                    link: "https://rss.xcancel.com/pierceboggan",
                    title: "Pierce Boggan / @pierceboggan",
                    image: {
                        url: "https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg"
                    },
                    item: [item]
                }
            }
        };

        const expectedOutput = `id = x.feed:https://xcancel.com/jaredpalmer/status/2019817235163074881#m

feedId = x.feed

uri = https://xcancel.com/jaredpalmer/status/2019817235163074881#m

date = 2026-02-06 16:55:29 +0000
updatedDate = nil

markedDate = nil

rules = []

title = nil

contentWarning = nil

body:
<p>Stacked Diffs on <a href="https://xcancel.com/github" title="GitHub">@GitHub</a> will start rolling out to early design partners in an alpha next month. In the meantime, here's video of our progress so far: <br>
<br>
(h/t for <a href="https://xcancel.com/georgebrock" title="George Brocklehurst">@georgebrock</a> + team for their awesome work)</p>
<a href="https://xcancel.com/jaredpalmer/status/2019817235163074881#m">
<br>Video<br>
  <img src="https://pbs.twimg.com/amplify_video_thumb/2019816932434685952/img/dElESJBztW4jqsI4.jpg" style="max-width:250px;" />
</a>

bodyPreview:
Stacked Diffs on  {
}
@GitHub {
	NSLink = https://xcancel.com/github
}
 will start rolling out to early design partners in an alpha next month. In the meantime, here's video of our progress so far: 

(h/t for  {
}
@georgebrock {
	NSLink = https://xcancel.com/georgebrock
}
 + team for their awesome work) {
}
Video {
	NSLink = https://xcancel.com/jaredpalmer/status/2019817235163074881#m
}

author:
  name = jaredpalmer
  username = @jaredpalmer
  uri = https://xcancel.com/jaredpalmer
  avatar = https://unavatar.io/twitter/jaredpalmer

annotation:
  text = @pierceboggan Reposted
  icon = arrow.2.squarepath
  uri = https://xcancel.com/pierceboggan

link attachment:
  url = https://xcancel.com/jaredpalmer/status/2019817235163074881
  title = Video
  subtitle = nil
  authorName = nil
  authorProfile = nil
  image = https://pbs.twimg.com/amplify_video_thumb/2019816932434685952/img/dElESJBztW4jqsI4.jpg
  blurhash = nil
  aspectSize = nil`;

        const results = xload(input);

        const result = results[0];
        const actualOutput = serializeItem(result);

        expect(actualOutput).toBe(expectedOutput);
    });

    test('quote tweet author name should be clickable (issue #15)', () => {
        // Quote tweets have <b>Author Name (@handle)</b> which should become a link
        const item = {
          "description": "<p>Multi model review should really be formalized!</p>\n<hr/>\n<blockquote>\n<b>Scott Hanselman \ud83c\udf2e (@shanselman)</b>\n<p>\n<p>GitHub Copilot CLI lets me do code reviews across *multiple* models.</p>\n</p>\n<footer>\n\u2014 <cite><a href=\"https://rss.xcancel.com/shanselman/status/2020379052738306188#m\">https://rss.xcancel.com/shanselman/status/2020379052738306188#m</a>\n</footer>\n</blockquote>",
          "dc:creator": "@OrenMe",
          "title": "Multi model review should really be formalized!",
          "link": "https://rss.xcancel.com/OrenMe/status/2020392031248605547#m",
          "guid$attrs": { "isPermaLink": "false" },
          "pubDate": "Sat, 08 Feb 2026 06:59:31 GMT",
          "guid": "2020392031248605547"
        };

        const input = {
            rss: {
                channel: {
                    link: "https://rss.xcancel.com/OrenMe",
                    title: "Oren Meiri / @OrenMe",
                    image: {
                        url: "https://pbs.twimg.com/profile_images/1952736802508267520/sIA41s69_400x400.jpg"
                    },
                    item: [item]
                }
            }
        };

        const results = xload(input);
        const result = results[0];

        // The <b>Scott Hanselman (@shanselman)</b> should be wrapped in a link
        expect(result.body).toContain('<a href="https://xcancel.com/shanselman"><b>Scott Hanselman \ud83c\udf2e (@shanselman)</b></a>');
        // The rss.xcancel.com links in the body should be normalized
        expect(result.body).not.toContain('rss.xcancel.com');
    });
});
