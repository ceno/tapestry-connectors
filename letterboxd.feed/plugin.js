
// letterboxd.feed

if (require('letterboxd-shared.js') === false) {
    throw new Error("Failed to load letterboxd-shared.js");
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
        const html = await sendRequest(`https://letterboxd.com/${cleanName}/`);
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

async function verify() {
    try {
        const cleanName = cleanUsername(getVariable('username', null));
        const feedUrl = buildFeedUrl(cleanName);

        const xml = await sendRequest(feedUrl);
        const jsonObject = await xmlParse(xml);

        if (!jsonObject.rss || !jsonObject.rss.channel) {
            processError(new Error("Could not read the Letterboxd feed. Is the username correct?"));
            return;
        }

        const displayName = parseChannelTitle(jsonObject.rss.channel.title) || cleanName;
        const avatar = await fetchAvatar(cleanName);

        const verification = {
            displayName: displayName,
            baseUrl: "https://letterboxd.com"
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
        const entryTypeChoice = getVariable('entryTypes', 'Everything');

        const cleanName = cleanUsername(getVariable('username', null));
        const feedUrl = buildFeedUrl(cleanName);

        if (debugMode) {
            console.log(`Debug: username=${cleanName}, entryTypes=${entryTypeChoice}, url=${feedUrl}`);
        }

        const response = await sendConditionalRequest(feedUrl);

        if (!response) {
            // null response means 304 Not Modified
            processResults([]);
            return;
        }

        const jsonObject = await xmlParse(response);

        const avatar = await fetchAvatar(cleanName);

        const userInfo = {
            username: cleanName,
            displayName: null,
            avatar: avatar
        };
        const options = {
            entryTypes: ENTRY_TYPE_MAP[entryTypeChoice] || null,
            debug: debugMode
        };

        const results = letterboxdLoad(jsonObject, userInfo, options);

        if (debugMode) {
            console.log(`Debug: letterboxdLoad parsed ${results.length} items`);
        }

        processResults(results);
    }
    catch (error) {
        processError(error);
    }
}
