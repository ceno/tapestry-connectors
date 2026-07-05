// anilist-shared.js - Shared logic for AniList user activity feeds

const GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

// Activity type filter choices from ui-config mapped to AniList ActivityType values
const ACTIVITY_TYPE_MAP = {
    "All activity": null,
    "List updates only": "MEDIA_LIST",
    "Posts only": "TEXT"
};

const USER_QUERY = `query ($name: String) {
    User(name: $name) {
        id
        name
        avatar { large }
        siteUrl
    }
}`;

const ACTIVITIES_QUERY = `query ($userId: Int, $type: ActivityType, $perPage: Int) {
    Page(perPage: $perPage) {
        activities(userId: $userId, type: $type, sort: ID_DESC) {
            __typename
            ... on ListActivity {
                id
                status
                progress
                createdAt
                siteUrl
                user { name avatar { large } siteUrl }
                media {
                    title { userPreferred }
                    siteUrl
                    coverImage { extraLarge large }
                    bannerImage
                    type
                    format
                    episodes
                    chapters
                }
            }
            ... on TextActivity {
                id
                text(asHtml: true)
                createdAt
                siteUrl
                user { name avatar { large } siteUrl }
            }
        }
    }
}`;

/**
 * Normalize a username input: accepts "Name", "@Name", or a profile URL
 * like "https://anilist.co/user/Name/". AniList names are alphanumeric
 * and case is preserved.
 * @param {string} input - raw user input
 * @returns {string} clean username
 */
function cleanUsername(input) {
    if (!input) {
        throw new Error("No AniList username provided");
    }
    let name = input.trim();
    const urlMatch = name.match(/anilist\.co\/user\/([^\/\s?#]+)/i);
    if (urlMatch) {
        name = urlMatch[1];
    }
    if (name.startsWith("@")) {
        name = name.substring(1);
    }
    name = name.replace(/\/+$/, "");
    if (!/^[A-Za-z0-9]+$/.test(name)) {
        throw new Error(`"${input}" doesn't look like a valid AniList username`);
    }
    return name;
}

/**
 * Build a GraphQL request body. Variables with undefined values are omitted.
 * @param {string} query - GraphQL query text
 * @param {Object} variables - variables for the query
 * @returns {string} JSON string for the POST body
 */
function graphqlBody(query, variables) {
    return JSON.stringify({ query: query, variables: variables || {} });
}

/**
 * Parse a GraphQL response, raising the first error if present.
 * @param {string|Object} response - raw response text or parsed object
 * @returns {Object} the "data" payload
 */
function parseGraphqlResponse(response) {
    const json = (typeof response === "string") ? JSON.parse(response) : response;
    if (json.errors && json.errors.length > 0) {
        throw new Error(`AniList returned an error: ${json.errors[0].message}`);
    }
    if (!json.data) {
        throw new Error("Unexpected response from AniList");
    }
    return json.data;
}

/**
 * Extract the user from a User query response.
 * @param {string|Object} response - raw response text or parsed object
 * @returns {{id: number, name: string, avatar: string|null, siteUrl: string}}
 */
function parseUser(response) {
    let data;
    try {
        data = parseGraphqlResponse(response);
    }
    catch (e) {
        if (/Not Found/i.test(e.message)) {
            throw new Error("AniList user not found. Is the username correct?");
        }
        throw e;
    }
    const user = data.User;
    if (!user) {
        throw new Error("AniList user not found. Is the username correct?");
    }
    return {
        id: user.id,
        name: user.name,
        avatar: (user.avatar && user.avatar.large) || null,
        siteUrl: user.siteUrl || `https://anilist.co/user/${user.id}`
    };
}

/**
 * Escape text for inclusion in HTML content.
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
 * Build the HTML body for a list activity.
 * "watched episode" + "1 - 146" + "Xian Ni" →
 * '<p><b>Watched episode</b> 1 - 146 of <a href="...">Xian Ni</a></p>'
 * "plans to watch" + null + "Title" → '<p><b>Plans to watch</b> <a href="...">Title</a></p>'
 * @param {string} status - activity status ("watched episode", "read chapter", ...)
 * @param {string|null} progress - progress text ("5", "1 - 118", ...)
 * @param {string} title - media title
 * @param {string} mediaUrl - media page URL
 * @returns {string} HTML body
 */
function formatListActivityBody(status, progress, title, mediaUrl) {
    const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Updated";
    const middle = progress ? ` ${escapeHtml(progress)} of ` : " ";
    const link = mediaUrl
        ? `<a href="${mediaUrl}">${escapeHtml(title)}</a>`
        : escapeHtml(title);
    return `<p><b>${escapeHtml(statusText)}</b>${middle}${link}</p>`;
}

/**
 * Extract all <img> tags from HTML, returning their srcs and the HTML with
 * image-only paragraphs removed (so they aren't duplicated as attachments).
 * @param {string} html
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
    // Remove paragraphs that contain only images
    let body = html.replace(/<p>\s*(?:<img[^>]*\/?>\s*)+<\/p>/gi, "");
    // Remove any remaining inline images; they are provided as attachments
    body = body.replace(/<img[^>]*\/?>/gi, "");
    return { images, body: body.trim() };
}

/**
 * Build the author Identity for an activity.
 * @param {Object} user - activity user {name, avatar, siteUrl}
 * @returns {Object} Identity
 */
function activityAuthor(user) {
    const identity = Identity.createWithName(user.name);
    identity.username = `@${user.name}`;
    if (user.siteUrl) {
        identity.uri = user.siteUrl;
    }
    if (user.avatar && user.avatar.large) {
        identity.avatar = user.avatar.large;
    }
    return identity;
}

/**
 * Convert an AniList activities response into Tapestry items.
 *
 * @param {string|Object} response - activities query response (text or parsed)
 * @param {Object} options - {debug: boolean}
 * @returns {Array} Tapestry Item objects
 */
function anilistLoad(response, options) {
    options = options || {};
    const debug = options.debug === true;

    const data = parseGraphqlResponse(response);
    const page = data.Page;
    if (!page || !page.activities) {
        return [];
    }

    const results = [];
    for (const activity of page.activities) {
        try {
            if (!activity || !activity.siteUrl || !activity.createdAt) {
                // Skip activity types we don't query fields for (e.g. messages)
                continue;
            }

            const date = new Date(activity.createdAt * 1000);
            const item = Item.createWithUriDate(activity.siteUrl, date);

            if (activity.user && activity.user.name) {
                item.author = activityAuthor(activity.user);
            }

            if (activity.__typename === "ListActivity") {
                const media = activity.media || {};
                const title = (media.title && media.title.userPreferred) || "Unknown title";
                item.body = formatListActivityBody(activity.status, activity.progress, title, media.siteUrl);

                const coverUrl = media.coverImage && (media.coverImage.extraLarge || media.coverImage.large);
                if (coverUrl) {
                    const cover = MediaAttachment.createWithUrl(coverUrl);
                    cover.text = `Cover art for ${title}`;
                    item.attachments = [cover];
                }

                if (media.type === "ANIME" || media.type === "MANGA") {
                    const label = media.type === "ANIME" ? "Anime" : "Manga";
                    const annotation = Annotation.createWithText(label);
                    if (media.siteUrl) {
                        annotation.uri = media.siteUrl;
                    }
                    item.annotations = [annotation];
                }
            }
            else if (activity.__typename === "TextActivity") {
                const { images, body } = extractImages(activity.text || "");
                if (body) {
                    item.body = body;
                }
                if (images.length > 0) {
                    item.attachments = images.map((src) => MediaAttachment.createWithUrl(src));
                }
            }
            else {
                continue;
            }

            results.push(item);

            if (debug) {
                console.log(`Debug: Parsed activity ${activity.id} (${activity.__typename})`);
            }
        }
        catch (activityError) {
            if (debug) {
                console.log(`Debug: Error parsing activity: ${activityError.message}`);
            }
            // Skip problematic activities and continue
        }
    }

    return results;
}

// Node.js compatibility for testing - only runs when module.exports is available
// Tapestry doesn't have module.exports, so this block is skipped in Tapestry
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GRAPHQL_ENDPOINT,
        ACTIVITY_TYPE_MAP,
        USER_QUERY,
        ACTIVITIES_QUERY,
        cleanUsername,
        graphqlBody,
        parseGraphqlResponse,
        parseUser,
        escapeHtml,
        formatListActivityBody,
        extractImages,
        anilistLoad
    };
}
