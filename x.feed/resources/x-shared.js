// x-shared.js - Shared feed parsing logic for X feeds

// Debug flag for conditional logging (set by xload)
let debugEnabled = false;

// Get avatar URL for a Twitter/X username using unavatar.io
// This service resolves profile pictures without requiring API calls
function getAvatarUrl(username) {
    if (!username) return null;
    // Remove @ prefix if present
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    return `https://unavatar.io/twitter/${cleanUsername}`;
}

// Normalize URLs to prevent duplicates from xcancel.com vs rss.xcancel.com
function normalizeXCancelUrl(url) {
    if (url && typeof url === 'string') {
        // Only normalize if the URL starts with https://rss.xcancel.com/
        // This ensures we're replacing the hostname, not arbitrary text in the URL
        if (url.startsWith("https://rss.xcancel.com/") || url.startsWith("http://rss.xcancel.com/")) {
            return url.replace("://rss.xcancel.com/", "://xcancel.com/");
        }
    }
    return url;
}

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

// Detect Twitter card images (link preview thumbnails) and pair them with the first external link.
// Card images use pbs.twimg.com/card_img/ URLs, as opposed to regular tweet images (pbs.twimg.com/media/).
// Returns { imageUrl, externalLink } or null if no card image or no external link found.
function extractCardInfo(content, feedUrl) {
    if (!content || !feedUrl) return null;
    
    // Look for a card_img URL in an <img> tag
    const cardImgMatch = content.match(/src=["']([^"']*pbs\.twimg\.com\/card_img\/[^"']*)["']/);
    if (!cardImgMatch) return null;
    
    let imageUrl = cardImgMatch[1];
    // Fix encoded ampersands
    if (imageUrl.includes("&amp;")) {
        imageUrl = imageUrl.replaceAll("&amp;", "&");
    }
    
    // Find the first external link to pair with this card image
    const externalLink = extractExternalLinkFromContent(content, feedUrl);
    if (!externalLink) return null;
    
    return {
        imageUrl: imageUrl,
        externalLink: externalLink
    };
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
            if (debugEnabled) {
                console.log("Debug: Unexpected node type in extractString:");
                console.log(node);
            }
        }
    }
    
    return null;
}

function xload(jsonObject, debug = false) {
    debugEnabled = debug;
    
    if (debugEnabled) {
        console.log("Debug: Full JSON object:");
        console.log(JSON.stringify(jsonObject));
    }
            
    if (jsonObject.rss != null && jsonObject.rss.channel != null) {
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
            // Normalize xcancel URLs to prevent duplicates
            url = normalizeXCancelUrl(url);
            const urlClean = url.split("?").splice(0,1).join();
            const urlParameters = url.split("?").splice(1).join("?");
            if (urlParameters.includes("utm_id") || urlParameters.includes("utm_source") || urlParameters.includes("utm_medium") || urlParameters.includes("utm_campaign")) {
                if (debugEnabled) {
                    console.log(`Debug: Removed parameters: ${urlParameters}`);
                }
                url = urlClean;
            }

            let title = extractString(item.title);
            let content = extractString((item["content:encoded"] ?? item.description), true);
            if (content) {
                content = content.replaceAll("https://rss.xcancel.com/", "https://xcancel.com/");
                // Make quoted tweet author names clickable: <b>Name (@handle)</b> → <a href="..."><b>Name (@handle)</b></a>
                content = content.replace(/<b>([^<]*?\(@(\w+)\))<\/b>/g, '<a href="https://xcancel.com/$2"><b>$1</b></a>');
            }

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
                annotation.uri = normalizeXCancelUrl(feedUrl);
                // Show the retweeter's avatar (retweeter is always the feed owner)
                annotation.icon = channelImage ?? getAvatarUrl(retweeter);
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
                        identity.uri = normalizeXCancelUrl(linkParts.slice(0, 4).join("/")); // e.g., https://xcancel.com/digitarald
                        // If this post is from the feed owner, use the channel image as avatar
                        if (channelImage && feedUrl) {
                            const feedOwner = feedUrl.split("/").pop(); // e.g., "pierceboggan"
                            if (displayName.toLowerCase() === feedOwner.toLowerCase()) {
                                identity.avatar = channelImage;
                            }
                            else {
                                // For other authors (e.g., in retweets), use unavatar.io
                                identity.avatar = getAvatarUrl(displayName);
                            }
                        }
                        else {
                            // No channel image available, use unavatar.io
                            identity.avatar = getAvatarUrl(displayName);
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
            // Check for card images (link preview thumbnails from Twitter)
            // These should become LinkAttachments paired with the external URL they preview
            const cardInfo = feedUrl ? extractCardInfo(rawContent, feedUrl) : null;

            if (videoInfo) {
                let linkAttachment = LinkAttachment.createWithUrl(normalizeXCancelUrl(videoInfo.statusPageUrl));
                linkAttachment.title = "Video";
                if (videoInfo.thumbnailUrl) {
                    linkAttachment.image = videoInfo.thumbnailUrl;
                }
                attachments.push(linkAttachment);
            }
            else if (cardInfo) {
                let linkAttachment = LinkAttachment.createWithUrl(cardInfo.externalLink);
                linkAttachment.image = cardInfo.imageUrl;
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
            
            // add link attachment for link that isn't on this site (e.g. a link blog)
            // but only if there isn't media already attached
            if (attachments.length == 0 && feedUrl != null) {
                let linkPrefix = url.split("/").splice(0,3).join("/");
                let feedPrefix = feedUrl.split("/").splice(0,3).join("/");
                if (linkPrefix != feedPrefix) {
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
        extractCardInfo,
        extractExternalLinkFromContent,
        extractImagesFromHtml,
        normalizeXCancelUrl
    };
}
