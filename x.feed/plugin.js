
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
    const feedUrl = getFeedUrl();
    let xml = await sendRequest(feedUrl, "GET", null, {"user-agent": userAgent})
    let jsonObject = await xmlParse(xml);
    
    if (jsonObject.feed != null) {
        // Atom 1.0
        const feedAttributes = jsonObject.feed.link$attrs;
        let baseUrl = null;
        if (feedAttributes instanceof Array) {
            for (const feedAttribute of feedAttributes) {
                if (feedAttribute?.rel == "alternate") {
                    baseUrl = feedAttribute.href;
                    break;
                }
            }
        }
        else {
            if (feedAttributes?.rel == "alternate") {
                baseUrl = feedAttributes.href;
            }
        }
        const displayName = jsonObject.feed.title?.trim();
        let icon = null;
        if (jsonObject.feed.icon != null) {
            icon = jsonObject.feed.icon;
            const verification = {
                displayName: displayName,
                icon: icon,
                baseUrl: baseUrl
            };
            processVerification(verification);
        }
        if (baseUrl != null && icon === null) {
            let siteUrl = baseUrl.split("/").splice(0,3).join("/");
            let icon = await lookupIcon(siteUrl);
            const verification = {
                displayName: displayName,
                icon: icon,
                baseUrl: baseUrl
            };
            processVerification(verification);
        }
        else {
            // try to get icon from the feed
            let feedUrl = null;
            if (feedAttributes instanceof Array) {
                for (const feedAttribute of feedAttributes) {
                    if (feedAttribute?.rel == "self") {
                        feedUrl = feedAttribute.href;
                        break;
                    }
                }
            }
            else {
                if (feedAttributes?.rel == "self") {
                    feedUrl = feedAttributes.href;
                }
            }
            if (feedUrl != null) {
                let siteUrl = feedUrl.split("/").splice(0,3).join("/");
                let icon = await lookupIcon(siteUrl);
                const verification = {
                    displayName: displayName,
                    icon: icon,
                    baseUrl: baseUrl
                };
                processVerification(verification);
            }
            else {
                const verification = {
                    displayName: displayName,
                    icon: null,
                    baseUrl: baseUrl
                };
                processVerification(verification);
            }
        }
        
    }
    else if (jsonObject.rss != null && jsonObject.rss.channel != null) {
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
    else if (jsonObject["rdf:RDF"] != null) {
        // RSS 1.0
        const baseUrl = jsonObject["rdf:RDF"].channel.link;
        const displayName = jsonObject["rdf:RDF"].channel.title?.trim();

// NOTE: In theory, you can get the icon from the RDF channel. In practice, places like
// Slashdot haven't updated this image since the beginning of this century.
// 			if (jsonObject["rdf:RDF"].channel.image$attrs != null) {
// 				icon = jsonObject["rdf:RDF"].channel.image$attrs["rdf:resource"];
// 				const verification = {
// 					displayName: displayName,
// 					icon: icon,
// 					baseUrl: baseUrl
// 				};
// 				processVerification(verification);
// 			}
        let feedUrl = baseUrl.split("/").splice(0,3).join("/");
        let icon = await lookupIcon(feedUrl);
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

async function load() {
    const feedUrl = getFeedUrl();
    const response = await sendConditionalRequest(feedUrl, "GET", null, {"user-agent": userAgent})

    if (!response) {
        // null response means 304 Not Modified
        processResults([]);
        return;
    }
    
    //original xml
    //console.log(response) 
    let jsonObject = await xmlParse(response);
    //console.log(jsonObject) 

    processResults(xload(jsonObject));
}
