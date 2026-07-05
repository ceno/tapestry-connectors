
// myanimelist.feed

if (require('myanimelist-shared.js') === false) {
    throw new Error("Failed to load myanimelist-shared.js");
}

// Safely read a Tapestry variable, returning fallback if undefined
function getVariable(name, fallback) {
    try {
        const value = eval(name);
        return (value !== undefined && value !== null && value !== '') ? value : fallback;
    } catch (e) {
        return fallback;
    }
}

async function fetchAvatar(cleanName) {
    const cacheKey = `avatar:${cleanName}`;
    const cached = getItem(cacheKey);
    if (cached) {
        return cached;
    }
    try {
        const html = await sendRequest(`https://myanimelist.net/profile/${cleanName}`, "GET", null, REQUEST_HEADERS);
        const avatar = extractAvatarFromProfileHtml(html);
        if (avatar) {
            setItem(cacheKey, avatar);
        }
        return avatar;
    }
    catch (e) {
        return null;
    }
}

// Limit Jikan lookups per load to stay well under its rate limits;
// covers are cached so the map fills up over a couple of loads
const MAX_COVER_FETCHES_PER_LOAD = 10;
const COVER_CACHE_KEY = "covers:v1";
const COVER_CACHE_MAX_ENTRIES = 400;
// Jikan allows 3 requests/second; stay under it
const COVER_FETCH_DELAY_MS = 500;

function readCoverCache() {
    try {
        return JSON.parse(getItem(COVER_CACHE_KEY) || "{}") || {};
    }
    catch (e) {
        return {};
    }
}

function fetchMissingCovers(jsonObjects, debugMode) {
    return fetchCovers(jsonObjects, {
        request: (url) => sendRequest(url),
        readCache: readCoverCache,
        writeCache: (map) => setItem(COVER_CACHE_KEY, JSON.stringify(map)),
        maxFetches: MAX_COVER_FETCHES_PER_LOAD,
        delayMs: COVER_FETCH_DELAY_MS,
        maxCacheEntries: COVER_CACHE_MAX_ENTRIES,
        debug: debugMode
    });
}

async function verify() {
    try {
        const cleanName = cleanUsername(getVariable('username', null));
        const listTypeChoice = getVariable('listType', 'Anime');
        const feedTypes = LIST_TYPE_MAP[listTypeChoice] || ["rw"];
        const feedUrl = buildFeedUrl(cleanName, feedTypes[0]);

        const xml = await sendRequest(feedUrl, "GET", null, REQUEST_HEADERS);
        const jsonObject = await xmlParse(xml);

        if (!jsonObject.rss || !jsonObject.rss.channel) {
            processError(new Error("Could not read the MyAnimeList feed. The list may be private or the username may be wrong."));
            return;
        }

        const displayName = parseChannelTitle(jsonObject.rss.channel.title) || cleanName;
        const avatar = await fetchAvatar(cleanName);

        const verification = {
            displayName: displayName,
            baseUrl: "https://myanimelist.net"
        };
        if (avatar) {
            verification.icon = avatar;
        }
        processVerification(verification);
    }
    catch (error) {
        processError(error);
    }
}

async function load() {
    try {
        const debugMode = getVariable('debug', 'off') === 'on';
        const listTypeChoice = getVariable('listType', 'Anime');

        const cleanName = cleanUsername(getVariable('username', null));
        const feedTypes = LIST_TYPE_MAP[listTypeChoice] || ["rw"];

        if (debugMode) {
            console.log(`Debug: username=${cleanName}, listType=${listTypeChoice}, feeds=${feedTypes.join(",")}`);
        }

        const avatar = await fetchAvatar(cleanName);
        const userInfo = {
            username: cleanName,
            avatar: avatar
        };

        const jsonObjects = [];
        for (const feedType of feedTypes) {
            const feedUrl = buildFeedUrl(cleanName, feedType);

            if (debugMode) {
                console.log(`Debug: Feed URL: ${feedUrl}`);
            }

            const xml = await sendRequest(feedUrl, "GET", null, REQUEST_HEADERS);
            jsonObjects.push(await xmlParse(xml));
        }

        const covers = await fetchMissingCovers(jsonObjects, debugMode);
        const options = {
            debug: debugMode,
            covers: covers
        };

        let results = [];
        for (const jsonObject of jsonObjects) {
            results = results.concat(malLoad(jsonObject, userInfo, options));
        }

        results.sort((a, b) => b.date - a.date);

        if (debugMode) {
            console.log(`Debug: malLoad parsed ${results.length} items`);
        }

        processResults(results);
    }
    catch (error) {
        processError(error);
    }
}
