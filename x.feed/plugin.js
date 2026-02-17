
// x.feed

if (require('x-shared.js') === false) {
    throw new Error("Failed to load x-shared.js");
}

// people who sniff user agents are dumb and their rules are even dumber, because of course we are:
//   a Macintosh
//   with an Intel processor
//   running Mac OS X 10.6.3
//   in Germany
//   using WebKit
//   in an awesome RSS reader
const userAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_3; de-de) AppleWebKit/531.22.7 (KHTML, like Gecko) NetNewsWire/3.2.7 Tapestry/1.3";

function getFeedUrl() {
    return `${site}/${handle}/rss`;
}

async function verify() {
    try {
        const feedUrl = getFeedUrl();
        let xml = await sendRequest(feedUrl, "GET", null, {"user-agent": userAgent})
        let jsonObject = await xmlParse(xml);

        if (jsonObject.rss != null && jsonObject.rss.channel != null) {
            // RSS 2.0
// TODO: Check that XML is good:
// if (jsonObject.rss instanceof Object	&& jsonObject.rss.channel instanceof Object) { ... }

            const baseUrl = jsonObject.rss.channel?.link;
            const displayName = jsonObject.rss.channel?.title?.trim();

            // Use the channel image URL for the user's avatar (X/Twitter profile images are always square)
            const icon = jsonObject.rss.channel?.image?.url ?? null;

            const verification = {
                displayName: displayName,
                icon: icon,
                baseUrl: baseUrl
            };
            processVerification(verification);
        }
        else {
            // Unknown
            processError(Error("Unknown feed format"));
        }
    }
    catch (error) {
        processError(error);
    }
}

async function load() {
    try {
        const feedUrl = getFeedUrl();
        const response = await sendConditionalRequest(feedUrl, "GET", null, {"user-agent": userAgent})

        if (!response) {
            // null response means 304 Not Modified
            processResults([]);
            return;
        }

        const debugMode = (debug === "on");
        if (debugMode) {
            console.log("Debug: Original XML response");
            console.log(response);
        }

        let jsonObject = await xmlParse(response);

        if (debugMode) {
            console.log("Debug: Parsed JSON object");
            console.log(jsonObject);
        }

        const items = await xload(jsonObject, debugMode);
        processResults(items);
    }
    catch (error) {
        processError(error);
    }
}
