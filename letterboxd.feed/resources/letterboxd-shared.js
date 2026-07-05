// letterboxd-shared.js - Shared feed parsing logic for Letterboxd user activity feeds

// Entry type filter choices from ui-config mapped to guid prefixes
const ENTRY_TYPE_MAP = {
    "Everything": null,
    "Diary and reviews": ["letterboxd-watch", "letterboxd-review"],
    "Reviews only": ["letterboxd-review"]
};

/**
 * Normalize a username input: accepts "dave", "@dave", or a profile URL
 * like "https://letterboxd.com/dave/".
 * @param {string} input - raw user input
 * @returns {string} clean lowercase username
 */
function cleanUsername(input) {
    if (!input) {
        throw new Error("No Letterboxd username provided");
    }
    let name = input.trim();
    const urlMatch = name.match(/letterboxd\.com\/([^\/\s?#]+)/i);
    if (urlMatch) {
        name = urlMatch[1];
    }
    if (name.startsWith("@")) {
        name = name.substring(1);
    }
    name = name.replace(/\/+$/, "");
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`"${input}" doesn't look like a valid Letterboxd username`);
    }
    return name.toLowerCase();
}

/**
 * Build the RSS feed URL for a username.
 * @param {string} username - clean username
 * @returns {string} feed URL
 */
function buildFeedUrl(username) {
    return `https://letterboxd.com/${username}/rss/`;
}

/**
 * Extract a display name from the RSS channel title.
 * "Letterboxd - Dave Vis" → "Dave Vis"
 * @param {string} channelTitle
 * @returns {string|null}
 */
function parseChannelTitle(channelTitle) {
    if (!channelTitle) {
        return null;
    }
    return channelTitle.replace(/^Letterboxd\s*-\s*/, "").trim() || null;
}

/**
 * Extract the og:image URL (the member's avatar) from profile page HTML.
 * @param {string} html
 * @returns {string|null}
 */
function extractAvatarFromProfileHtml(html) {
    if (!html || typeof html !== "string") {
        return null;
    }
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    return match ? match[1] : null;
}

/**
 * Determine the entry type from an item's guid.
 * "letterboxd-watch-123" → "letterboxd-watch"
 * @param {string} guid
 * @returns {string} guid prefix, or "" when missing
 */
function entryTypeFromGuid(guid) {
    if (!guid || typeof guid !== "string") {
        return "";
    }
    const match = guid.match(/^(letterboxd-[a-z]+)-/);
    return match ? match[1] : "";
}

/**
 * Extract all <img> tags from HTML, returning their srcs and the HTML with
 * poster-only paragraphs removed (so they aren't duplicated as attachments).
 * @param {string} html - description HTML
 * @returns {{images: string[], body: string}}
 */
function extractImages(html) {
    if (!html || typeof html !== "string") {
        return { images: [], body: "" };
    }
    const images = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        images.push(match[1]);
    }
    // Remove paragraphs that contain only images (the poster block)
    let body = html.replace(/<p>\s*(?:<img[^>]*\/?>\s*)+<\/p>/gi, "");
    // Remove any remaining inline images; they are provided as attachments
    body = body.replace(/<img[^>]*\/?>/gi, "");
    return { images, body: body.trim() };
}

/**
 * Parse the poster crop size from a Letterboxd image URL.
 * ".../228628-toy-story-4-0-600-0-900-crop.jpg" → {width: 600, height: 900}
 * @param {string} url
 * @returns {{width: number, height: number}|null}
 */
function posterAspectSize(url) {
    const match = url.match(/-0-(\d+)-0-(\d+)-crop/);
    if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
    return null;
}

/**
 * Convert a parsed Letterboxd RSS feed into Tapestry items.
 *
 * @param {Object} jsonObject - result of xmlParse() on the RSS feed
 * @param {Object} userInfo - {username, displayName, avatar}
 * @param {Object} options - {entryTypes: string[]|null, debug: boolean}
 * @returns {Array} Tapestry Item objects
 */
function letterboxdLoad(jsonObject, userInfo, options) {
    options = options || {};
    const entryTypes = options.entryTypes || null;
    const debug = options.debug === true;

    const channel = jsonObject && jsonObject.rss && jsonObject.rss.channel;
    if (!channel) {
        throw new Error("Unexpected response from Letterboxd. Is the username correct?");
    }

    let entries = channel.item;
    if (!entries) {
        return [];
    }
    if (!(entries instanceof Array)) {
        entries = [entries];
    }

    const displayName = userInfo.displayName || parseChannelTitle(channel.title) || userInfo.username;
    const profileUrl = `https://letterboxd.com/${userInfo.username}/`;

    const results = [];
    for (const entry of entries) {
        try {
            const guid = entry.guid || "";
            const type = entryTypeFromGuid(guid);
            if (entryTypes && !entryTypes.includes(type)) {
                continue;
            }

            const link = entry.link;
            if (!link || !entry.pubDate) {
                continue;
            }

            const date = new Date(entry.pubDate);
            if (isNaN(date.getTime())) {
                continue;
            }

            const item = Item.createWithUriDate(link, date);
            item.title = entry.title || null;

            const { images, body } = extractImages(entry.description || "");
            if (body) {
                item.body = body;
            }

            const identity = Identity.createWithName(entry["dc:creator"] || displayName);
            identity.username = `@${userInfo.username}`;
            identity.uri = profileUrl;
            if (userInfo.avatar) {
                identity.avatar = userInfo.avatar;
            }
            item.author = identity;

            const attachments = [];
            for (const src of images) {
                const media = MediaAttachment.createWithUrl(src);
                const aspectSize = posterAspectSize(src);
                if (aspectSize) {
                    media.aspectSize = aspectSize;
                }
                const filmTitle = entry["letterboxd:filmTitle"];
                media.text = filmTitle ? `Poster for ${filmTitle}` : "Film poster";
                attachments.push(media);
            }
            if (attachments.length > 0) {
                item.attachments = attachments;
            }

            const annotations = [];
            if (entry["letterboxd:rewatch"] === "Yes") {
                const annotation = Annotation.createWithText("Rewatch");
                annotation.uri = link;
                annotations.push(annotation);
            }
            if (type === "letterboxd-review") {
                const annotation = Annotation.createWithText("Review");
                annotation.uri = link;
                annotations.push(annotation);
            }
            if (annotations.length > 0) {
                item.annotations = annotations;
            }

            results.push(item);

            if (debug) {
                console.log(`Debug: Parsed entry: ${entry.title} (${guid})`);
            }
        }
        catch (entryError) {
            if (debug) {
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
        cleanUsername,
        buildFeedUrl,
        parseChannelTitle,
        extractAvatarFromProfileHtml,
        entryTypeFromGuid,
        extractImages,
        posterAspectSize,
        letterboxdLoad,
        ENTRY_TYPE_MAP
    };
}
