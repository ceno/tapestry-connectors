// x-shared.js - Shared feed parsing logic for X feeds

function attachmentForAttributes(mediaAttributes) {
    let attachment = null;
    if (mediaAttributes != null && mediaAttributes.url != null) {
        let url = mediaAttributes.url;
        if (url.includes("&amp;")) { // attempt to make an invalid URL into a valid one: looking at you Daily Beast
            url = url.replaceAll("&amp;", "&");
        }
        attachment = MediaAttachment.createWithUrl(url);
        if (mediaAttributes.width != null && mediaAttributes.height != null) {
            let width = mediaAttributes.width;
            let height = mediaAttributes.height;
            attachment.aspectSize = { width: width, height: height };
        }
        attachment.mimeType = "image";
    }
    return attachment;
}

// Extract video info from HTML content if it contains an amplify_video_thumb
// Returns { thumbnailUrl, statusPageUrl } or null if no video found
function extractVideoInfo(content, itemLink) {
    if (!content || !itemLink) return null;
    
    // Look for amplify_video_thumb in the content (indicates a video)
    const videoThumbMatch = content.match(/amplify_video_thumb\/(\d+)/);
    if (!videoThumbMatch) return null;
    
    // Extract the thumbnail URL
    const thumbMatch = content.match(/src=["']([^"']*amplify_video_thumb[^"']*)["']/);
    const thumbnailUrl = thumbMatch ? thumbMatch[1].replace(/&amp;/g, "&") : null;
    
    // The itemLink points to the status page (e.g., https://xcancel.com/user/status/123456#m)
    // Remove the #m fragment if present
    const statusPageUrl = itemLink.replace(/#.*$/, "");
    
    return {
        thumbnailUrl: thumbnailUrl,
        statusPageUrl: statusPageUrl
    };
}

// Extract video source URL from xcancel status page HTML
// Returns the video mp4 URL or null if not found
function extractVideoUrlFromPage(html) {
    if (!html) return null;
    
    // Look for the video source element: <source src="https://video.twimg.com/..." type="video/mp4">
    const sourceMatch = html.match(/<source\s+src=["']([^"']+)["']\s+type=["']video\/mp4["']/);
    if (sourceMatch) {
        return sourceMatch[1];
    }
    
    // Also try alternate format where type comes before src
    const altMatch = html.match(/<source\s+type=["']video\/mp4["']\s+src=["']([^"']+)["']/);
    if (altMatch) {
        return altMatch[1];
    }
    
    return null;
}

// Extract all image URLs from <img> tags in HTML content
// Returns an array of image URLs (may be empty if no images found)
function extractImagesFromHtml(content) {
    if (!content) return [];
    
    const images = [];
    const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
        let imgUrl = match[1];
        // Fix encoded ampersands
        if (imgUrl.includes("&amp;")) {
            imgUrl = imgUrl.replaceAll("&amp;", "&");
        }
        images.push(imgUrl);
    }
    
    return images;
}

// Extract the first external link from HTML content that isn't on the same domain as the feed
function extractExternalLinkFromContent(content, feedUrl) {
    if (!content || !feedUrl) return null;
    
    // Get the feed's domain prefix (e.g., "https://xcancel.com")
    const feedPrefix = feedUrl.split("/").splice(0, 3).join("/");
    
    // Match href attributes in anchor tags
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    
    while ((match = hrefRegex.exec(content)) !== null) {
        const linkUrl = match[1];
        // Skip internal links (same domain as feed) and xcancel links (which are just tweet references)
        if (linkUrl.startsWith("http://") || linkUrl.startsWith("https://")) {
            const linkPrefix = linkUrl.split("/").splice(0, 3).join("/");
            if (linkPrefix !== feedPrefix && !linkUrl.includes("xcancel.com")) {
                return linkUrl;
            }
        }
    }
    
    return null;
}

function extractString(node, allowHTML = false) {
    // people love to put HTML in title & descriptions, where it's not allowed - this is an
    // imperfect attempt to undo that damage
    if (node != null) {
        if (typeof(node) == "string") {
            return node.trim();
        }
        else if (typeof(node) == "object") {
            // do a traversal of the node graph to generate a string representation of <p> and <a> elements
            if (node["p"] != null) {
                if (node["p"] instanceof Array) {
                    let value = "";
                    for (const childNode of node["p"]) {
                        const string = extractString(childNode, allowHTML);
                        if (allowHTML) {
                            value += `<p>${string}</p>\n`;
                        }
                        else {
                            value += string;
                        }
                    }
                    return value;
                }
                else {
                    const string = extractString(node["p"], allowHTML);
                    if (allowHTML) {
                        return `<p>${string}</p>\n`;
                    }
                    else {
                        return string;
                    }
                }
            }
            else if (node["a"] != null) {
                if (node["a"] instanceof Array) {
                    let value = "";
                    for (const childNode of node["a"]) {
                        const string = extractString(childNode, allowHTML);
                        if (allowHTML && node["a$attrs"]?.href != null) {
                            value += `<a href="${node["a$attrs"]?.href}">${string}</a>`;
                        }
                        else {
                            value += string;
                        }
                    }
                    return value;
                }
                else {
                    const string = extractString(node["a"], allowHTML);
                    if (allowHTML && node["a$attrs"]?.href != null) {
                        return `<a href="${node["a$attrs"]?.href}">${string}</a>`;
                    }
                    else {
                        return string;
                    }
                }
            }
        }
        else {
            console.log(node);
        }
    }
    
    return null;
}

function xload(jsonObject) {
    console.log(JSON.stringify(jsonObject))
            
    if (jsonObject.feed != null) {
        // Atom 1.0
        const feedAttributes = jsonObject.feed.link$attrs;
        let feedUrl = null;
        if (feedAttributes instanceof Array) {
            for (const feedAttribute of feedAttributes) {
                if (feedAttribute?.rel == "alternate") {
                    feedUrl = feedAttribute.href;
                    break;
                }
            }
        }
        else if (feedAttributes?.rel == "alternate") {
            feedUrl = feedAttributes.href;
        } else if (
            jsonObject.feed.id.startsWith("http://") ||
            jsonObject.feed.id.startsWith("https://")
        ) {
            feedUrl = jsonObject.feed.id
        }
        const feedName = jsonObject.feed.title;
    
        let entries = [];
        if (jsonObject.feed.entry != null) {
            const entry = jsonObject.feed.entry;
            if (entry instanceof Array) {
                entries = entry;
            }
            else {
                entries = [entry];
            }
        }
        var results = [];
        for (const entry of entries) {
            const entryAttributes = entry.link$attrs;
            let entryUrl = null;
            if (entryAttributes instanceof Array) {
                for (const entryAttribute of entryAttributes) {
                    if (entryAttribute.rel == "alternate") {
                        entryUrl = entryAttribute.href;
                        break;
                    }
                }
                // Posts need to have a link and if we didn't find one
                // with rel == "alternate" then we'll use the first link.
                if (!entryUrl && entryAttributes.length > 0) {
                    entryUrl = entryAttributes[0].href;
                }
            }
            else {
                if (entryAttributes.rel == "alternate" || entryAttributes.rel == null) {
                    entryUrl = entryAttributes.href;
                }
            }

            let url = entryUrl;
            if (true) { // NOTE: If this causes problems, we can put it behind a setting.
                const urlClean = url.split("?").splice(0,1).join();
                const urlParameters = url.split("?").splice(1).join("?");
                if (urlParameters.includes("utm_id") || urlParameters.includes("utm_source") || urlParameters.includes("utm_medium") || urlParameters.includes("utm_campaign")) {
                    console.log(`removed parameters: ${urlParameters}`);
                    url = urlClean;
                }
            }

            let date = null;
            if (entry.published) {
                date = new Date(entry.published);
            }
            else if (entry.updated) {
                date = new Date(entry.updated);
            }
            else {
                date = new Date();
            }
            const title = extractString(entry.title);
            
            let content = ""
            if (entry.content$attrs != null && entry.content$attrs["type"] == "xhtml") {
                content = entry.content$xhtml;
            }
            else {
                content = extractString((entry.content ?? entry.summary), true);
            }
            
            var identity = null;
            if (entry.author != null) {
                let authorName = entry.author.name;
                if (authorName != null) {
                    if (authorName instanceof Array) {
                        authorName = authorName.join(", ");
                    }
                    else {
                        authorName = authorName.trim();
                    }
                    identity = Identity.createWithName(authorName);
                    if (entry.author.uri != null) {
                        identity.uri = entry.author.uri;
                    }
                }
            }
            
            const resultItem = Item.createWithUriDate(url, date);
            if (title != null) {
                resultItem.title = title;
            }
            if (content != null) {
                resultItem.body = content;
            }
            if (identity != null) {
                resultItem.author = identity;
            }
            if (entryAttributes instanceof Array) {
                const attachments = entryAttributes
                .filter(e => {
                    if (e.type) {
                        // Check for a MIME type that suggests this is an image, e.g. image/jpeg.
                        return e.type.startsWith("image/");
                    } else {
                        return false;
                    }
                })
                .map(link => {
                    const attachment = MediaAttachment.createWithUrl(link.href);
                    attachment.text = link.title || link.text;
                    attachment.mimeType = "image";
                    return attachment;
                })
                if (attachments.length > 0) {
                    resultItem.attachments = attachments;
                }
            }
            else {
                // extract any media from RSS: https://www.rssboard.org/media-rss
                if (entry["media:group"] != null) {
                    const mediaGroup = entry["media:group"];

                    const mediaAttributes = mediaGroup["media:thumbnail$attrs"];
                    let attachment = attachmentForAttributes(mediaAttributes);
                    if (attachment != null) {
                        resultItem.attachments = [attachment];
                    }
                }
                else if (entry["media:thumbnail$attrs"] != null) {
                    const mediaAttributes = entry["media:thumbnail$attrs"];
                    let attachment = attachmentForAttributes(mediaAttributes);
                    if (attachment != null) {
                        resultItem.attachments = [attachment];
                    }
                }
                else if (entry["media:content$attrs"] != null) {
                    const mediaAttributes = entry["media:content$attrs"];
                    let attachment = attachmentForAttributes(mediaAttributes);
                    if (attachment != null) {
                        resultItem.attachments = [attachment];
                    }
                }
            }

            results.push(resultItem);
        }

        return results;
    }
    else if (jsonObject.rss != null && jsonObject.rss.channel != null) {
        // RSS 2.0
        const feedUrl = jsonObject.rss.channel?.link;
        // Try to extract channel owner avatar (for xcancel/X feeds)
        const channelImage = jsonObject.rss.channel?.image?.url;

        let items = [];
        if (jsonObject.rss.channel.item != null) {
            const item = jsonObject.rss.channel.item;
            if (item instanceof Array) {
                items = item;
            }
            else {
                items = [item];
            }
        }

        let results = [];
        for (const item of items) {
            if (item.link == null) {
                continue;
            }

            let itemDate = item["pubDate"] ?? item["dc:date"] ?? item["a10:updated"];
            if (itemDate?.endsWith(" Z")) { // the Date parser is pretty dumb
                itemDate = itemDate.slice(0, -2) + "GMT";
            }
            const date = (itemDate == null ? new Date() : new Date(itemDate));
            
            let url = item.link;
            if (true) { // NOTE: If this causes problems, we can put it behind a setting.
                const urlClean = url.split("?").splice(0,1).join();
                const urlParameters = url.split("?").splice(1).join("?");
                if (urlParameters.includes("utm_id") || urlParameters.includes("utm_source") || urlParameters.includes("utm_medium") || urlParameters.includes("utm_campaign")) {
                    console.log(`removed parameters: ${urlParameters}`);
                    url = urlClean;
                }
            }
            
            let title = extractString(item.title);
            let content = extractString((item["content:encoded"] ?? item.description), true);

            // Check if this is a retweet (title starts with "RT by @username:")
            let annotation = null;
            let retweetMatch = title?.match(/^RT by (@\w+):\s*/);
            if (retweetMatch) {
                // Skip retweets if the user has disabled them
                if (includeRetweets !== "on") {
                    continue;
                }
                const retweeter = retweetMatch[1];
                annotation = Annotation.createWithText(`${retweeter} Reposted`);
                // Link to the retweeter's profile
                annotation.uri = feedUrl; // This links to the feed owner's profile
            }

            let identity = null;
            let authorName = item["dc:creator"] ?? item["author"];
            if (authorName != null) {
                if (authorName instanceof Array) {
                    authorName = authorName.join(", ");
                }
                else {
                    authorName = authorName.trim();
                }
                // For X posts, dc:creator is already in @username format
                // We'll use it as both the name and username for post-style
                let displayName = authorName;
                if (displayName.startsWith("@")) {
                    displayName = displayName.substring(1); // Remove @ for display name
                }
                identity = Identity.createWithName(displayName);
                identity.username = authorName.startsWith("@") ? authorName : "@" + authorName;
                // Build profile URI from the item link (extract base xcancel URL)
                if (item.link) {
                    const linkParts = item.link.split("/");
                    if (linkParts.length >= 4) {
                        identity.uri = linkParts.slice(0, 4).join("/"); // e.g., https://xcancel.com/digitarald
                        // If this post is from the feed owner, use the channel image as avatar
                        if (channelImage && feedUrl) {
                            const feedOwner = feedUrl.split("/").pop(); // e.g., "pierceboggan"
                            if (displayName.toLowerCase() === feedOwner.toLowerCase()) {
                                identity.avatar = channelImage;
                            }
                        }
                    }
                }
            }
            
            const resultItem = Item.createWithUriDate(url, date);
            // For post-style items, don't set the title - the body is the main content
            // resultItem.title = title; // Commented out for post-style
            if (content != null) {
                resultItem.body = content;
            }
            if (identity != null) {
                resultItem.author = identity;
            }
            if (annotation != null) {
                resultItem.annotations = [annotation];
            }
        
            let attachments = []
            const rawContent = item["content:encoded"] ?? item.description;
            
            // Check for video content first (X/Twitter videos)
            // Since we can't fetch the actual video URL, create a LinkAttachment to the status page
            const videoInfo = extractVideoInfo(rawContent, item.link);
            if (videoInfo) {
                let linkAttachment = LinkAttachment.createWithUrl(videoInfo.statusPageUrl);
                linkAttachment.title = "Video";
                if (videoInfo.thumbnailUrl) {
                    linkAttachment.image = videoInfo.thumbnailUrl;
                }
                attachments.push(linkAttachment);
            }
            // extract any media from RSS: https://www.rssboard.org/media-rss
            else if (item["media:group"] != null) {
                const mediaGroup = item["media:group"];

                const mediaAttributes = mediaGroup["media:thumbnail$attrs"];
                let attachment = attachmentForAttributes(mediaAttributes);
                if (attachment != null) {
                    attachments.push(attachment);
                }
            }
            else if (item["media:thumbnail$attrs"] != null) {
                const mediaAttributes = item["media:thumbnail$attrs"];
                let attachment = attachmentForAttributes(mediaAttributes);
                if (attachment != null) {
                    attachments.push(attachment);
                }
            }
            else if (item["media:content$attrs"] != null) {
                const mediaAttributes = item["media:content$attrs"];
                let attachment = attachmentForAttributes(mediaAttributes);
                if (attachment != null) {
                    attachments.push(attachment);
                }
            }
            else if (item["enclosure$attrs"] != null) {
                let enclosure = item["enclosure$attrs"];
                if (enclosure.url != null) {
                    let attachment = MediaAttachment.createWithUrl(enclosure.url);
                    attachments.push(attachment);
                }
            }
            else {
                // Fallback: extract <img> tags from HTML description
                const imageUrls = extractImagesFromHtml(rawContent);
                for (const imgUrl of imageUrls) {
                    let attachment = MediaAttachment.createWithUrl(imgUrl);
                    attachment.mimeType = "image";
                    attachments.push(attachment);
                }
            }
            
            // add link attachment for external links
            // For X/Twitter posts, always check for external links embedded in the content
            if (feedUrl != null) {
                let linkPrefix = url.split("/").splice(0,3).join("/");
                let feedPrefix = feedUrl.split("/").splice(0,3).join("/");
                if (linkPrefix != feedPrefix) {
                    // This is a link to a different site (e.g. a link blog)
                    let attachment = LinkAttachment.createWithUrl(item["link"]);
                    attachments.push(attachment);
                }
                else {
                    // For X/Twitter posts, check for external links embedded in the content
                    const externalLink = extractExternalLinkFromContent(rawContent, feedUrl);
                    if (externalLink) {
                        let attachment = LinkAttachment.createWithUrl(externalLink);
                        attachments.push(attachment);
                    }
                }
            }
            
            if (attachments.length > 0) {
                resultItem.attachments = attachments;
            }
            
            results.push(resultItem);
        }

        return results;
    }
    else if (jsonObject["rdf:RDF"] != null) {
        // RSS 1.0
        const feedUrl = jsonObject["rdf:RDF"].channel.link;
        const feedName = jsonObject["rdf:RDF"].channel.title;

        const item = jsonObject["rdf:RDF"].item;
        let items = null;
        if (item instanceof Array) {
            items = item;
        }
        else {
            items = [item];
        }
        var results = [];
        for (const item of items) {
            if (item["dc:date"] == null) {
                continue;
            }
            
            let url = item.link;
            if (true) { // NOTE: If this causes problems, we can put it behind a setting.
                const urlClean = url.split("?").splice(0,1).join();
                const urlParameters = url.split("?").splice(1).join("?");
                if (urlParameters.includes("utm_id") || urlParameters.includes("utm_source") || urlParameters.includes("utm_medium") || urlParameters.includes("utm_campaign")) {
                    console.log(`removed parameters: ${urlParameters}`);
                    url = urlClean;
                }
            }

            const date = new Date(item["dc:date"]);
            let title = extractString(item.title);
            let content = extractString(item.description, true);

            let identity = null;
            let authorName = item["dc:creator"];
            if (authorName != null) {
                if (authorName instanceof Array) {
                    authorName = authorName.join(", ");
                }
                else {
                    authorName = authorName.trim();
                }
                identity = Identity.createWithName(authorName);
                identity.uri = feedUrl;
            }
            
            const resultItem = Item.createWithUriDate(url, date);
            if (title != null) {
                resultItem.title = title;
            }
            if (content != null) {
                resultItem.body = content;
            }
            if (identity != null) {
                resultItem.author = identity;
            }
                
            results.push(resultItem);
        }

        return results;
    }
    else {
        // Unknown
        return [];
    }
}

// Node.js compatibility for testing - only runs when module.exports is available
// Tapestry doesn't have module.exports, so this block is skipped in Tapestry
if (typeof module !== 'undefined' && module.exports) {
    // Mock Tapestry classes for Node.js testing
    if (typeof Identity === 'undefined') {
        global.Identity = {
            createWithName: (name) => ({ name, username: null, uri: null, avatar: null })
        };
    }
    if (typeof Item === 'undefined') {
        global.Item = {
            createWithUriDate: (uri, date) => ({ uri, date, title: null, body: null, author: null, attachments: null, annotations: null })
        };
    }
    if (typeof MediaAttachment === 'undefined') {
        global.MediaAttachment = {
            createWithUrl: (url) => ({ url, mimeType: null, aspectSize: null, text: null })
        };
    }
    if (typeof LinkAttachment === 'undefined') {
        global.LinkAttachment = {
            createWithUrl: (url) => ({ url })
        };
    }
    if (typeof Annotation === 'undefined') {
        global.Annotation = {
            createWithText: (text) => ({ text, uri: null, icon: null })
        };
    }
    if (typeof includeRetweets === 'undefined') {
        global.includeRetweets = "on";
    }
    
    module.exports = { 
        xload, 
        extractString, 
        attachmentForAttributes,
        extractVideoInfo,
        extractExternalLinkFromContent,
        extractImagesFromHtml
    };
}
