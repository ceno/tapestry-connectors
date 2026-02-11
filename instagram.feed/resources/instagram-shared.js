// instagram-shared.js - Shared parsing logic for Instagram feeds

// GraphQL document ID for user media query
// NOTE: This may need updating every ~2-4 weeks when Instagram rotates these
const GRAPHQL_DOC_ID = "17888483320059182";

// Instagram's internal app ID (stable)
const INSTAGRAM_APP_ID = "936619743392459";

// Realistic Chrome User-Agent to avoid bot detection
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// --- Token & ID extraction ---

function extractLsdToken(html) {
    if (!html) return null;
    // Pattern 1: LSD module definition
    const match1 = html.match(/"LSD",\[\],\{"token":"([^"]+)"\}/);
    if (match1) return match1[1];
    // Pattern 2: alternative lsd placement
    const match2 = html.match(/"lsd"[^"]*"([^"]+)"/);
    if (match2) return match2[1];
    return null;
}

function extractUserIdFromWebProfileInfo(json) {
    try {
        return json?.data?.user?.id || null;
    } catch (e) {
        return null;
    }
}

// --- Web Profile Info API parsing ---
// The web_profile_info endpoint returns both profile data and posts in one call

function parseWebProfileInfo(json, handle) {
    try {
        const user = json?.data?.user;
        if (!user) return { profile: null, posts: [] };

        const profile = {
            name: user.full_name || user.username || handle,
            username: user.username || handle,
            avatar: user.profile_pic_url || null,
            id: user.id || null
        };

        const edges = user.edge_owner_to_timeline_media?.edges;
        let posts = [];
        if (edges && Array.isArray(edges)) {
            posts = edges.map(edge => normalizeGraphQLNode(edge.node, handle)).filter(p => p !== null);
        }

        return { profile, posts };
    } catch (e) {
        return { profile: null, posts: [] };
    }
}

function extractProfileInfo(json) {
    try {
        const user = json?.data?.user;
        if (!user) return null;
        return {
            name: user.full_name || user.username || null,
            username: user.username || null,
            avatar: user.profile_pic_url || null,
            id: user.id || null
        };
    } catch (e) {
        return null;
    }
}

// --- GraphQL response parsing ---

function parseGraphQLResponse(json, handle) {
    try {
        const edges = json?.data?.user?.edge_owner_to_timeline_media?.edges;
        if (!edges || !Array.isArray(edges)) return [];
        return edges.map(edge => normalizeGraphQLNode(edge.node, handle)).filter(p => p !== null);
    } catch (e) {
        return [];
    }
}

function normalizeGraphQLNode(node, handle) {
    if (!node) return null;
    const post = {
        id: node.id,
        shortcode: node.shortcode,
        typename: node.__typename || "GraphImage",
        timestamp: node.taken_at_timestamp,
        caption: extractCaption(node),
        displayUrl: node.display_url,
        isVideo: node.is_video || false,
        videoUrl: node.video_url || null,
        width: node.dimensions?.width || null,
        height: node.dimensions?.height || null,
        owner: node.owner?.username || handle,
        thumbnailSrc: node.thumbnail_src || node.display_url,
        children: []
    };

    // Handle carousel (GraphSidecar) children
    if (node.__typename === "GraphSidecar" && node.edge_sidecar_to_children?.edges) {
        post.children = node.edge_sidecar_to_children.edges
            .map(edge => normalizeGraphQLNode(edge.node, handle))
            .filter(child => child !== null);
    }

    return post;
}

function extractCaption(node) {
    return node?.edge_media_to_caption?.edges?.[0]?.node?.text || "";
}

// --- Item building ---

function buildPostItem(post, handle) {
    const url = "https://www.instagram.com/p/" + post.shortcode + "/";
    const date = new Date(post.timestamp * 1000);
    const item = Item.createWithUriDate(url, date);

    // Body is the formatted caption
    item.body = formatCaptionAsHtml(post.caption);

    // Author identity
    const ownerName = post.owner || handle;
    const identity = Identity.createWithName(ownerName);
    identity.username = "@" + ownerName;
    identity.uri = "https://www.instagram.com/" + ownerName + "/";
    item.author = identity;

    // Attachments
    let attachments = [];
    if (post.typename === "GraphSidecar" && post.children.length > 0) {
        for (const child of post.children) {
            const att = buildMediaAttachment(child);
            if (att) attachments.push(att);
        }
    } else {
        const att = buildMediaAttachment(post);
        if (att) attachments.push(att);
    }

    if (attachments.length > 0) {
        item.attachments = attachments;
    }

    return item;
}

function buildMediaAttachment(post) {
    if (post.isVideo && post.videoUrl) {
        // Video with direct URL
        const attachment = MediaAttachment.createWithUrl(post.videoUrl);
        attachment.mimeType = "video";
        if (post.thumbnailSrc || post.displayUrl) {
            attachment.thumbnail = post.thumbnailSrc || post.displayUrl;
        }
        if (post.width && post.height) {
            attachment.aspectSize = { width: post.width, height: post.height };
        }
        return attachment;
    } else if (post.isVideo) {
        // Video without direct URL - use LinkAttachment (matches x.feed pattern)
        const postUrl = "https://www.instagram.com/p/" + post.shortcode + "/";
        const attachment = LinkAttachment.createWithUrl(postUrl);
        attachment.title = "Video";
        if (post.thumbnailSrc || post.displayUrl) {
            attachment.image = post.thumbnailSrc || post.displayUrl;
        }
        return attachment;
    } else if (post.displayUrl) {
        // Image
        const attachment = MediaAttachment.createWithUrl(post.displayUrl);
        attachment.mimeType = "image";
        if (post.width && post.height) {
            attachment.aspectSize = { width: post.width, height: post.height };
        }
        return attachment;
    }
    return null;
}

// --- Caption formatting ---

function formatCaptionAsHtml(caption) {
    if (!caption) return "";

    // HTML-escape special characters
    let html = caption
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Convert @mentions to links
    html = html.replace(/@(\w+)/g, '<a href="https://www.instagram.com/$1/">@$1</a>');

    // Convert #hashtags to links
    html = html.replace(/#(\w+)/g, '<a href="https://www.instagram.com/explore/tags/$1/">#$1</a>');

    // Convert newlines to <br>
    html = html.replace(/\n/g, "<br>");

    // Wrap in paragraph
    return "<p>" + html + "</p>";
}

// --- Request headers ---

function buildRequestHeaders(sessionid) {
    const headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": INSTAGRAM_APP_ID
    };
    if (sessionid) {
        headers["Cookie"] = "sessionid=" + sessionid;
    }
    return headers;
}

// --- Node.js compatibility for testing ---
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
            createWithUrl: (url) => ({ url, mimeType: null, aspectSize: null, text: null, thumbnail: null })
        };
    }
    if (typeof LinkAttachment === 'undefined') {
        global.LinkAttachment = {
            createWithUrl: (url) => ({ url, title: null, image: null })
        };
    }
    if (typeof Annotation === 'undefined') {
        global.Annotation = {
            createWithText: (text) => ({ text, uri: null, icon: null })
        };
    }

    module.exports = {
        extractLsdToken,
        extractUserIdFromWebProfileInfo,
        parseWebProfileInfo,
        extractProfileInfo,
        parseGraphQLResponse,
        normalizeGraphQLNode,
        extractCaption,
        buildPostItem,
        formatCaptionAsHtml,
        buildRequestHeaders,
        buildMediaAttachment,
        GRAPHQL_DOC_ID,
        INSTAGRAM_APP_ID,
        USER_AGENT
    };
}
