
// anilist.feed

if (require('anilist-shared.js') === false) {
    throw new Error("Failed to load anilist-shared.js");
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

const GRAPHQL_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
};

async function fetchUser(cleanName) {
    const response = await sendRequest(GRAPHQL_ENDPOINT, "POST", graphqlBody(USER_QUERY, { name: cleanName }), GRAPHQL_HEADERS);
    return parseUser(response);
}

async function resolveUserId(cleanName) {
    const cacheKey = `userid:${cleanName}`;
    const cached = getItem(cacheKey);
    if (cached) {
        return parseInt(cached, 10);
    }
    const user = await fetchUser(cleanName);
    setItem(cacheKey, String(user.id));
    return user.id;
}

async function verify() {
    try {
        const cleanName = cleanUsername(getVariable('username', null));
        const user = await fetchUser(cleanName);

        const verification = {
            displayName: user.name,
            baseUrl: "https://anilist.co"
        };
        if (user.avatar) {
            verification.icon = user.avatar;
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
        const activityChoice = getVariable('activityType', 'All activity');

        const cleanName = cleanUsername(getVariable('username', null));
        const userId = await resolveUserId(cleanName);

        const variables = { userId: userId, perPage: 25 };
        const activityType = ACTIVITY_TYPE_MAP[activityChoice] || null;
        if (activityType) {
            variables.type = activityType;
        }

        if (debugMode) {
            console.log(`Debug: username=${cleanName}, userId=${userId}, activityType=${activityChoice}`);
        }

        const response = await sendRequest(GRAPHQL_ENDPOINT, "POST", graphqlBody(ACTIVITIES_QUERY, variables), GRAPHQL_HEADERS);

        const results = anilistLoad(response, { debug: debugMode });

        if (debugMode) {
            console.log(`Debug: anilistLoad parsed ${results.length} items`);
        }

        processResults(results);
    }
    catch (error) {
        processError(error);
    }
}
