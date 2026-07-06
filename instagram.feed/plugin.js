
// instagram.feed

if (require('instagram-shared.js') === false) {
    throw new Error("Failed to load instagram-shared.js");
}

function getSessionId() {
    if (typeof useSessionId !== 'undefined' && useSessionId === "on" && typeof sessionid !== 'undefined') {
        return sessionid;
    }
    return '';
}

async function fetchProfileData(headers, debugMode) {
    const profileUrl = site + "/api/v1/users/web_profile_info/?username=" + handle;

    if (debugMode) {
        console.log("Debug: Fetching profile from:", profileUrl);
        console.log("Debug: Headers:", JSON.stringify(headers));
    }

    const response = await sendRequest(profileUrl, "GET", null, headers);

    if (debugMode) {
        console.log("Debug: Response type:", typeof response);
        console.log("Debug: Response length:", response ? response.length : 0);
        console.log("Debug: Response preview:", response ? response.substring(0, 200) : "(empty)");
    }

    return JSON.parse(response);
}

async function verify() {
    try {
        const headers = buildRequestHeaders(getSessionId());
        const json = await fetchProfileData(headers, false);

        const profileInfo = extractProfileInfo(json);
        if (profileInfo) {
            const verification = {
                displayName: profileInfo.name || handle,
                icon: profileInfo.avatar || null
            };
            processVerification(verification);
        } else {
            processError(Error("Could not verify Instagram account: no profile data in response"));
        }
    } catch (error) {
        processError(error);
    }
}

async function load() {
    console.log("Load function is called!!")
    const debugMode = (typeof debug !== 'undefined' && debug === "on");
    const filter = contentFilter || "all";

    try {
        const headers = buildRequestHeaders(getSessionId());

        if (debugMode) {
            console.log("Debug: site =", site);
            console.log("Debug: handle =", handle);
            console.log("Debug: contentFilter =", filter);
        }

        const json = await fetchProfileData(headers, debugMode);

        const result = parseWebProfileInfo(json, handle);

        if (debugMode) {
            console.log("Debug: Profile:", result.profile ? result.profile.name : "null");
            console.log("Debug: Posts found (before filter):", result.posts.length);
        }

        // Filter posts based on content type
        const filteredPosts = result.posts.filter(post => shouldIncludePost(post, filter));

        if (debugMode) {
            console.log("Debug: Posts found (after filter):", filteredPosts.length);
        }

        // Build Tapestry Items from filtered posts
        const items = filteredPosts.map((post) => {
            const item = buildPostItem(post, handle);
            if (result.profile?.avatar && item.author) {
                item.author.avatar = result.profile.avatar;
            }
            return item;
        });

        if (debugMode) {
            console.log("Debug: Items built:", items.length);
        }

        processResults(items);
    } catch (error) {
        if (debugMode) {
            console.log("Debug: load() error:", error.message);
            console.log("Debug: Error stack:", error.stack);
        }
        processError(error);
    }
}
