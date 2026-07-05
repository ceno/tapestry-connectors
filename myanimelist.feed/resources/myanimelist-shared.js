// myanimelist-shared.js - Shared feed parsing logic for MyAnimeList user update feeds

// List type choices from ui-config mapped to RSS feed types
const LIST_TYPE_MAP = {
    "Anime": ["rw"],
    "Manga": ["rm"],
    "Anime and manga": ["rw", "rm"]
};

// Browser-like headers to avoid bot detection on myanimelist.net
const REQUEST_HEADERS = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "accept-language": "en-US,en;q=0.9"
};

/**
 * Normalize a username input: accepts "Xinil", "@Xinil", or a profile URL
 * like "https://myanimelist.net/profile/Xinil". Case is preserved.
 * @param {string} input - raw user input
 * @returns {string} clean username
 */
function cleanUsername(input) {
    if (!input) {
        throw new Error("No MyAnimeList username provided");
    }
    let name = input.trim();
    const urlMatch = name.match(/myanimelist\.net\/profile\/([^\/\s?#]+)/i);
    if (urlMatch) {
        name = urlMatch[1];
    }
    if (name.startsWith("@")) {
        name = name.substring(1);
    }
    name = name.replace(/\/+$/, "");
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
        throw new Error(`"${input}" doesn't look like a valid MyAnimeList username`);
    }
    return name;
}

/**
 * Build the RSS feed URL for a username and feed type.
 * @param {string} username - clean username
 * @param {string} feedType - "rw" (anime) or "rm" (manga)
 * @returns {string} feed URL
 */
function buildFeedUrl(username, feedType) {
    return `https://myanimelist.net/rss.php?type=${feedType}&u=${encodeURIComponent(username)}`;
}

/**
 * Extract a display name from the RSS channel title.
 * "Xinil's Anime from MyAnimeList.net" → "Xinil"
 * @param {string} channelTitle
 * @returns {string|null}
 */
function parseChannelTitle(channelTitle) {
    if (!channelTitle) {
        return null;
    }
    const match = channelTitle.match(/^(.+?)'s (?:Anime|Manga) from MyAnimeList\.net$/);
    if (match) {
        return match[1];
    }
    return channelTitle.trim() || null;
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
 * Parse the list status from an item description.
 * "Watching - 623 of ? episodes" → "Watching"
 * @param {string} description
 * @returns {string|null}
 */
function parseStatus(description) {
    if (!description || typeof description !== "string") {
        return null;
    }
    const index = description.indexOf(" - ");
    const status = index >= 0 ? description.substring(0, index).trim() : description.trim();
    return status || null;
}

/**
 * Extract the media type and id from an anime/manga page URL.
 * "https://myanimelist.net/anime/21/One_Piece" → {type: "anime", id: "21"}
 * @param {string} link
 * @returns {{type: string, id: string}|null}
 */
function extractMalEntry(link) {
    if (!link || typeof link !== "string") {
        return null;
    }
    const match = link.match(/myanimelist\.net\/(anime|manga)\/(\d+)/i);
    if (!match) {
        return null;
    }
    return { type: match[1].toLowerCase(), id: match[2] };
}

/**
 * Build the Jikan API URL for an anime/manga entry.
 * @param {{type: string, id: string}} entry
 * @returns {string}
 */
function jikanUrl(entry) {
    return `https://api.jikan.moe/v4/${entry.type}/${entry.id}`;
}

/**
 * Extract the cover image URL from a Jikan API response.
 * @param {Object} json - parsed Jikan response
 * @returns {string|null}
 */
function parseJikanCover(json) {
    const images = json && json.data && json.data.images;
    const jpg = images && images.jpg;
    if (!jpg) {
        return null;
    }
    return jpg.large_image_url || jpg.image_url || null;
}

/**
 * Wait briefly between Jikan requests to respect its rate limit
 * (3 requests/second). Uses setTimeout when the runtime provides it,
 * otherwise falls back to a short blocking wait.
 * @param {number} ms
 * @returns {Promise}
 */
function rateLimitDelay(ms) {
    if (!ms || ms <= 0) {
        return Promise.resolve();
    }
    if (typeof setTimeout === "function") {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    const end = Date.now() + ms;
    while (Date.now() < end) {
        // JavaScriptCore may not provide timers; a bounded wait is the fallback
    }
    return Promise.resolve();
}

/**
 * Collect the unique anime/manga entries referenced by one or more parsed
 * RSS feeds, in feed order.
 * @param {Array} jsonObjects - results of xmlParse() on the RSS feeds
 * @returns {Array<{key: string, entry: {type: string, id: string}}>}
 */
function collectMalKeys(jsonObjects) {
    const seen = [];
    const keys = [];
    for (const jsonObject of jsonObjects || []) {
        const channel = jsonObject && jsonObject.rss && jsonObject.rss.channel;
        let entries = channel && channel.item;
        if (!entries) {
            continue;
        }
        if (!(entries instanceof Array)) {
            entries = [entries];
        }
        for (const entry of entries) {
            const malEntry = extractMalEntry(entry.link);
            if (!malEntry) {
                continue;
            }
            const key = `${malEntry.type}/${malEntry.id}`;
            if (!seen.includes(key)) {
                seen.push(key);
                keys.push({ key: key, entry: malEntry });
            }
        }
    }
    return keys;
}

/**
 * Fetch cover images for feed entries that aren't cached yet, respecting
 * Jikan's rate limit and retrying transient failures (e.g. HTTP 429) once.
 *
 * @param {Array} jsonObjects - results of xmlParse() on the RSS feeds
 * @param {Object} deps - injected environment:
 *   request: (url) => Promise<string> - fetch a URL, rejects on HTTP errors
 *   readCache: () => Object - current "{type}/{id}" → cover URL map
 *   writeCache: (map) => void - persist the map
 *   maxFetches: number - max unique titles to attempt per load
 *   delayMs: number - spacing between requests
 *   maxCacheEntries: number - cache size bound
 *   debug: boolean
 * @returns {Promise<Object>} the updated covers map
 */
async function fetchCovers(jsonObjects, deps) {
    const debug = deps.debug === true;
    const covers = deps.readCache() || {};

    const currentKeys = collectMalKeys(jsonObjects);
    const missing = currentKeys.filter(({ key }) => !(key in covers));
    const toFetch = missing.slice(0, deps.maxFetches);

    async function lookup(key, entry) {
        const text = await deps.request(jikanUrl(entry));
        const cover = parseJikanCover(JSON.parse(text));
        if (cover) {
            covers[key] = cover;
        }
    }

    let requested = 0;
    const failures = [];
    for (const { key, entry } of toFetch) {
        try {
            if (requested > 0) {
                await rateLimitDelay(deps.delayMs);
            }
            requested++;
            await lookup(key, entry);
        }
        catch (e) {
            failures.push({ key: key, entry: entry });
        }
    }

    // One retry pass for transient failures; anything still missing is
    // retried on the next load since only successes are cached
    for (const { key, entry } of failures) {
        try {
            await rateLimitDelay(deps.delayMs);
            await lookup(key, entry);
        }
        catch (e) {
            if (debug) {
                console.log(`Debug: Cover lookup failed for ${key}: ${e.message}`);
            }
        }
    }

    if (requested > 0) {
        if (Object.keys(covers).length > deps.maxCacheEntries) {
            // Cache full: persist only the covers needed for the current feed
            const trimmed = {};
            for (const { key } of currentKeys) {
                if (covers[key]) {
                    trimmed[key] = covers[key];
                }
            }
            deps.writeCache(trimmed);
        }
        else {
            deps.writeCache(covers);
        }
    }
    return covers;
}

/**
 * Escape text for safe inclusion in HTML.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Convert a parsed MyAnimeList RSS feed into Tapestry items.
 *
 * @param {Object} jsonObject - result of xmlParse() on the RSS feed
 * @param {Object} userInfo - {username, avatar}
 * @param {Object} options - {debug: boolean, covers: Object} - covers maps
 *   "{type}/{id}" keys (from extractMalEntry) to cover image URLs
 * @returns {Array} Tapestry Item objects
 */
function malLoad(jsonObject, userInfo, options) {
    options = options || {};
    const debug = options.debug === true;
    const covers = options.covers || {};

    const channel = jsonObject && jsonObject.rss && jsonObject.rss.channel;
    if (!channel) {
        throw new Error("Unexpected response from MyAnimeList. The list may be private or the username may be wrong.");
    }

    let entries = channel.item;
    if (!entries) {
        return [];
    }
    if (!(entries instanceof Array)) {
        entries = [entries];
    }

    const profileUrl = `https://myanimelist.net/profile/${userInfo.username}`;

    const results = [];
    for (const entry of entries) {
        try {
            const link = entry.link;
            if (!link || !entry.pubDate) {
                continue;
            }

            const date = new Date(entry.pubDate);
            if (isNaN(date.getTime())) {
                continue;
            }

            // The RSS link repeats across updates for the same title, so add
            // the update timestamp to keep each update's URI unique
            const uri = `${link}#${date.getTime()}`;

            const item = Item.createWithUriDate(uri, date);
            item.title = entry.title || null;

            const description = typeof entry.description === "string" ? entry.description.trim() : "";
            if (description) {
                item.body = `<p>${escapeHtml(description)}</p>`;
            }

            const identity = Identity.createWithName(userInfo.username);
            identity.username = `@${userInfo.username}`;
            identity.uri = profileUrl;
            if (userInfo.avatar) {
                identity.avatar = userInfo.avatar;
            }
            item.author = identity;

            // Prefer a cached cover image; otherwise link to the anime/manga
            // page so Tapestry can fill in a preview from Open Graph metadata
            const malEntry = extractMalEntry(link);
            const coverUrl = malEntry ? covers[`${malEntry.type}/${malEntry.id}`] : null;
            if (coverUrl) {
                const media = MediaAttachment.createWithUrl(coverUrl);
                media.text = entry.title ? `Cover art for ${entry.title}` : "Cover art";
                item.attachments = [media];
            }
            else {
                const linkAttachment = LinkAttachment.createWithUrl(link);
                linkAttachment.siteName = "MyAnimeList";
                item.attachments = [linkAttachment];
            }

            const status = parseStatus(description);
            if (status) {
                const annotation = Annotation.createWithText(status);
                annotation.uri = link;
                item.annotations = [annotation];
            }

            results.push(item);

            if (debug) {
                console.log(`Debug: Parsed entry: ${entry.title} (${status})`);
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
        extractMalEntry,
        jikanUrl,
        parseJikanCover,
        rateLimitDelay,
        collectMalKeys,
        fetchCovers,
        parseStatus,
        escapeHtml,
        malLoad,
        LIST_TYPE_MAP,
        REQUEST_HEADERS
    };
}
