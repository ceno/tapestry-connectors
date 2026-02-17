
// youtube.feed

if (require('youtube-shared.js') === false) {
    throw new Error("Failed to load youtube-shared.js");
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

async function verify() {
    try {
        const channelInfo = await resolveChannelId(handle);
        const feedUrl = buildFeedUrl(channelInfo.channelId, contentType);

        const xml = await sendRequest(feedUrl);
        const jsonObject = await xmlParse(xml);

        if (!jsonObject.feed || !jsonObject.feed.entry) {
            processError(new Error("No entries found in the YouTube feed. The channel may have no content of this type."));
            return;
        }

        const verification = {
            displayName: channelInfo.channelName,
            icon: channelInfo.channelAvatar,
            baseUrl: `https://www.youtube.com/@${handle.replace(/^@/, '')}`
        };
        processVerification(verification);
    }
    catch (error) {
        processError(error);
    }
}

async function load() {
    try {
        const debugMode = getVariable('debug', 'off') === 'on';

        // Read handle from Tapestry variable
        const currentHandle = getVariable('handle', null);
        const currentContentType = getVariable('contentType', 'All content');

        if (debugMode) {
            console.log(`Debug: handle=${JSON.stringify(currentHandle)}, contentType=${JSON.stringify(currentContentType)}`);
        }

        if (!currentHandle) {
            processError(new Error("No YouTube handle configured. Please set a YouTube @handle in the feed settings."));
            return;
        }

        const channelInfo = await resolveChannelId(currentHandle);

        if (debugMode) {
            console.log(`Debug: Resolved channel — id=${channelInfo.channelId}, name=${channelInfo.channelName}`);
        }

        const feedUrl = buildFeedUrl(channelInfo.channelId, currentContentType);

        if (debugMode) {
            console.log(`Debug: Feed URL: ${feedUrl}`);
        }

        const response = await sendConditionalRequest(feedUrl);

        if (!response) {
            // null response means 304 Not Modified
            processResults([]);
            return;
        }

        if (debugMode) {
            console.log("Debug: Original XML response");
            console.log(response);
        }

        const jsonObject = await xmlParse(response);

        if (debugMode) {
            console.log("Debug: Parsed JSON object");
            console.log(jsonObject);
        }

        const results = youtubeLoad(jsonObject, channelInfo, debugMode);

        if (debugMode) {
            console.log(`Debug: youtubeLoad parsed ${results.length} items`);
        }

        processResults(results);
    }
    catch (error) {
        processError(error);
    }
}
