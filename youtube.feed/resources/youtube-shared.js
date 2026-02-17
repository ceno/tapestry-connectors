// youtube-shared.js - Shared feed parsing logic for YouTube feeds

// Debug flag for conditional logging
let debugEnabled = false;

// Content type constants mapping ui-config choices to playlist prefixes
const CONTENT_TYPE_MAP = {
    "All content": "all",
    "Videos only": "videos",
    "Shorts only": "shorts",
    "Live streams only": "live"
};

/**
 * Convert bare URLs in HTML text to clickable <a> links.
 * Skips URLs already inside href attributes.
 * @param {string} html - HTML string potentially containing bare URLs
 * @returns {string} HTML with URLs wrapped in <a> tags
 */
function linkifyUrls(html) {
    // Match URLs not already inside an href="..." or <a> tag
    // This regex finds http/https URLs that are not preceded by href=" or src="
    return html.replace(/(https?:\/\/[^\s<>"]+)/g, function(match, url, offset, str) {
        // Check if this URL is already inside an href or src attribute
        const before = str.substring(Math.max(0, offset - 10), offset);
        if (/(?:href|src)=["']$/.test(before)) {
            return match;
        }
        return `<a href="${url}">${url}</a>`;
    });
}

/**
 * Resolve a YouTube @handle to a channel ID by scraping the channel page.
 * If the handle already starts with "UC", it's assumed to be a channel ID and returned directly.
 *
 * @param {string} handle - YouTube @handle or channel ID
 * @returns {Promise<{channelId: string, channelName: string, channelAvatar: string|null}>}
 */
async function resolveChannelId(handle) {
    if (!handle) {
        throw new Error("No YouTube handle provided");
    }

    // Strip leading @ if present
    let cleanHandle = handle.trim();
    if (cleanHandle.startsWith("@")) {
        cleanHandle = cleanHandle.substring(1);
    }

    // If it already looks like a channel ID, return it directly
    if (cleanHandle.startsWith("UC") && cleanHandle.length >= 24) {
        return {
            channelId: cleanHandle,
            channelName: cleanHandle,
            channelAvatar: null
        };
    }

    // Fetch the channel page to extract the channel ID.
    // Use a browser-like User-Agent to avoid bot detection,
    // and set CONSENT cookie to bypass EU consent screens.
    const channelUrl = `https://www.youtube.com/@${cleanHandle}`;
    const requestHeaders = {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "cookie": "CONSENT=YES+cb",
        "accept-language": "en-US,en;q=0.9"
    };
    let html;
    try {
        html = await sendRequest(channelUrl, "GET", null, requestHeaders);
    }
    catch (error) {
        throw new Error(`Could not load YouTube channel page for @${cleanHandle}: ${error.message}`);
    }

    if (!html || typeof html !== 'string') {
        throw new Error(`Empty response from YouTube channel page for @${cleanHandle}`);
    }

    let channelId = null;

    // Strategy 1: Look for RSS auto-discovery link
    // <link rel="alternate" type="application/rss+xml" ... href="...?channel_id=UCxxxxxxx">
    const rssLinkMatch = html.match(/channel_id=(UC[a-zA-Z0-9_-]+)/);
    if (rssLinkMatch) {
        channelId = rssLinkMatch[1];
    }

    // Strategy 2: Look for canonical URL containing /channel/UC...
    // <link rel="canonical" href="https://www.youtube.com/channel/UCxxxxxxx">
    if (!channelId) {
        const canonicalMatch = html.match(/rel="canonical"[^>]+href="[^"]*\/channel\/(UC[a-zA-Z0-9_-]+)"/i)
            || html.match(/href="[^"]*\/channel\/(UC[a-zA-Z0-9_-]+)"[^>]+rel="canonical"/i);
        if (canonicalMatch) {
            channelId = canonicalMatch[1];
        }
    }

    // Strategy 3: Look for externalId in page scripts (unique to the main channel)
    if (!channelId) {
        const externalIdMatch = html.match(/"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/);
        if (externalIdMatch) {
            channelId = externalIdMatch[1];
        }
    }

    // Strategy 4: Look for meta itemprop="channelId"
    if (!channelId) {
        const metaMatch = html.match(/itemprop=["']channelId["'][^>]+content=["'](UC[a-zA-Z0-9_-]+)["']/i)
            || html.match(/content=["'](UC[a-zA-Z0-9_-]+)["'][^>]+itemprop=["']channelId["']/i);
        if (metaMatch) {
            channelId = metaMatch[1];
        }
    }

    // Strategy 5 (last resort): Look for browse_id in page scripts
    if (!channelId) {
        const browseIdMatch = html.match(/"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/);
        if (browseIdMatch) {
            channelId = browseIdMatch[1];
        }
    }

    if (!channelId) {
        throw new Error(`Could not find channel ID for @${cleanHandle}. Make sure the handle is correct.`);
    }

    // Extract channel name from <title> tag or og:title
    let channelName = cleanHandle;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
        // YouTube titles are typically "Channel Name - YouTube"
        let title = titleMatch[1].trim();
        if (title.endsWith(" - YouTube")) {
            title = title.substring(0, title.length - " - YouTube".length).trim();
        }
        if (title) {
            channelName = title;
        }
    }

    // Extract channel avatar from og:image
    let channelAvatar = null;
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch) {
        channelAvatar = ogImageMatch[1];
    }

    if (debugEnabled) {
        console.log(`Debug: resolveChannelId("${handle}") → channelId=${channelId}, name=${channelName}, avatar=${channelAvatar ? 'yes' : 'no'}`);
    }

    return { channelId, channelName, channelAvatar };
}

/**
 * Build the RSS feed URL for a YouTube channel based on content type.
 *
 * @param {string} channelId - YouTube channel ID (starts with "UC")
 * @param {string} contentType - Content type from ui-config choices
 * @returns {string} The feed URL
 */
function buildFeedUrl(channelId, contentType) {
    const type = CONTENT_TYPE_MAP[contentType] || "all";
    const baseId = channelId.substring(2); // Strip "UC" prefix

    switch (type) {
        case "videos":
            return `https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${baseId}`;
        case "shorts":
            return `https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${baseId}`;
        case "live":
            return `https://www.youtube.com/feeds/videos.xml?playlist_id=UULV${baseId}`;
        case "all":
        default:
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    }
}

/**
 * Format a view count number into a human-readable string.
 *
 * @param {string|number} count - The raw view count
 * @returns {string} Formatted string like "1.2M views"
 */
function formatViewCount(count) {
    const num = typeof count === 'string' ? parseInt(count, 10) : count;

    if (isNaN(num) || num < 0) {
        return "0 views";
    }

    if (num === 1) {
        return "1 view";
    }

    if (num < 1000) {
        return `${num} views`;
    }

    if (num < 1000000) {
        const k = num / 1000;
        // Show decimal only if < 10K
        if (k < 10) {
            return `${k.toFixed(1)}K views`;
        }
        return `${Math.floor(k)}K views`;
    }

    if (num < 1000000000) {
        const m = num / 1000000;
        if (m < 10) {
            return `${m.toFixed(1)}M views`;
        }
        return `${Math.floor(m)}M views`;
    }

    const b = num / 1000000000;
    if (b < 10) {
        return `${b.toFixed(1)}B views`;
    }
    return `${Math.floor(b)}B views`;
}

/**
 * Parse a YouTube Atom feed (as JSON from xmlParse) into an array of Item objects.
 *
 * @param {Object} jsonObject - Parsed XML feed object
 * @param {Object} channelInfo - Channel info from resolveChannelId ({channelId, channelName, channelAvatar})
 * @param {boolean} debug - Whether to enable debug logging
 * @returns {Array} Array of Item objects
 */
function youtubeLoad(jsonObject, channelInfo, debug = false) {
    debugEnabled = debug;

    if (debugEnabled) {
        console.log("Debug: Full JSON object:");
        console.log(JSON.stringify(jsonObject));
    }

    if (!jsonObject.feed) {
        if (debugEnabled) {
            console.log("Debug: No feed element found in parsed XML");
        }
        return [];
    }

    const feed = jsonObject.feed;

    // Extract channel identity from feed metadata
    const feedTitle = feed.title || channelInfo.channelName || "YouTube Channel";
    const feedAuthorName = feed.author?.name || feedTitle;

    // Get channel URI from feed links
    let channelUri = null;
    if (feed.link$attrs) {
        if (feed.link$attrs instanceof Array) {
            for (const linkAttr of feed.link$attrs) {
                if (linkAttr.rel === "alternate") {
                    channelUri = linkAttr.href;
                    break;
                }
            }
        }
        else if (feed.link$attrs.rel === "alternate") {
            channelUri = feed.link$attrs.href;
        }
    }

    // Get entries (handle single entry vs array)
    let entries = [];
    if (feed.entry) {
        if (feed.entry instanceof Array) {
            entries = feed.entry;
        }
        else {
            entries = [feed.entry];
        }
    }

    if (debugEnabled) {
        console.log(`Debug: Found ${entries.length} entries in feed`);
    }

    let results = [];
    for (const entry of entries) {
        try {
            const videoId = entry["yt:videoId"];
            if (!videoId) {
                if (debugEnabled) {
                    console.log("Debug: Skipping entry without yt:videoId");
                }
                continue;
            }

            const title = typeof entry.title === 'string' ? entry.title.trim() : null;
            const published = entry.published || entry.updated;
            const date = published ? new Date(published) : new Date();

            // Build video URI from the link element or construct from videoId
            let videoUri = `https://www.youtube.com/watch?v=${videoId}`;
            if (entry.link$attrs) {
                if (entry.link$attrs instanceof Array) {
                    for (const linkAttr of entry.link$attrs) {
                        if (linkAttr.rel === "alternate" && linkAttr.href) {
                            videoUri = linkAttr.href;
                            break;
                        }
                    }
                }
                else if (entry.link$attrs.rel === "alternate" && entry.link$attrs.href) {
                    videoUri = entry.link$attrs.href;
                }
            }

            // Extract description from media:group > media:description
            let description = null;
            const mediaGroup = entry["media:group"];
            if (mediaGroup) {
                const rawDesc = mediaGroup["media:description"];
                if (rawDesc && typeof rawDesc === 'string') {
                    // Convert plain text to HTML with line breaks, then linkify URLs
                    description = "<p>" + rawDesc
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/\n\n/g, "</p><p>")
                        .replace(/\n/g, "<br>")
                        + "</p>";
                    // Linkify bare URLs in the HTML body
                    description = linkifyUrls(description);
                }
            }

            // Extract thumbnail from media:group > media:thumbnail
            let thumbnailUrl = null;
            let thumbnailWidth = null;
            let thumbnailHeight = null;
            if (mediaGroup) {
                const thumbAttrs = mediaGroup["media:thumbnail$attrs"];
                if (thumbAttrs) {
                    thumbnailUrl = thumbAttrs.url;
                    thumbnailWidth = thumbAttrs.width ? parseInt(thumbAttrs.width, 10) : null;
                    thumbnailHeight = thumbAttrs.height ? parseInt(thumbAttrs.height, 10) : null;
                }
            }

            // Extract view count from media:group > media:community > media:statistics
            let viewCount = null;
            if (mediaGroup && mediaGroup["media:community"]) {
                const community = mediaGroup["media:community"];
                const statsAttrs = community["media:statistics$attrs"];
                if (statsAttrs && statsAttrs.views) {
                    viewCount = statsAttrs.views;
                }
            }

            // Create Identity for the channel author
            const identity = Identity.createWithName(feedAuthorName);
            identity.username = channelInfo.channelName ? `@${channelInfo.channelName.replace(/\s+/g, '')}` : null;
            identity.uri = channelUri || `https://www.youtube.com/channel/${channelInfo.channelId}`;
            identity.avatar = channelInfo.channelAvatar || null;

            // Create Item
            const resultItem = Item.createWithUriDate(videoUri, date);
            resultItem.title = title;
            if (description) {
                resultItem.body = description;
            }
            resultItem.author = identity;

            // Attachments
            let attachments = [];

            // Video link as LinkAttachment (tappable card with thumbnail)
            const linkAttachment = LinkAttachment.createWithUrl(videoUri);
            linkAttachment.title = title || "YouTube Video";
            linkAttachment.siteName = "YouTube";
            if (thumbnailUrl) {
                linkAttachment.image = thumbnailUrl;
            }
            if (thumbnailWidth && thumbnailHeight) {
                linkAttachment.aspectSize = { width: thumbnailWidth, height: thumbnailHeight };
            }
            attachments.push(linkAttachment);

            if (attachments.length > 0) {
                resultItem.attachments = attachments;
            }

            // View count as Annotation
            if (viewCount) {
                const annotation = Annotation.createWithText(formatViewCount(viewCount));
                annotation.uri = videoUri;
                resultItem.annotations = [annotation];
            }

            results.push(resultItem);

            if (debugEnabled) {
                console.log(`Debug: Parsed entry: ${title} (${videoId}), views: ${viewCount}`);
            }
        }
        catch (entryError) {
            if (debugEnabled) {
                console.log(`Debug: Error parsing entry: ${entryError.message}`);
            }
            // Skip problematic entries and continue
        }
    }

    return results;
}

// Node.js compatibility for testing - only runs when module.exports is available
// Tapestry doesn't have module.exports, so this block is skipped in Tapestry
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resolveChannelId,
        buildFeedUrl,
        formatViewCount,
        linkifyUrls,
        youtubeLoad,
        CONTENT_TYPE_MAP
    };
}
