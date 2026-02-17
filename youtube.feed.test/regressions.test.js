// regressions.test.js - Regression tests for edge cases

require('../youtube.feed.test/mocks/tapestry');
const { youtubeLoad, buildFeedUrl, formatViewCount, linkifyUrls } = require('../youtube.feed/resources/youtube-shared');

describe('regressions', () => {
    const channelInfo = {
        channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
        channelName: 'MrBeast',
        channelAvatar: 'https://example.com/avatar.jpg'
    };

    test('handles entry with empty description', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:emptyDesc",
                    "yt:videoId": "emptyDesc",
                    title: "Empty Description",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=emptyDesc" },
                    "media:group": {
                        "media:description": "",
                        "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/emptyDesc/hqdefault.jpg" },
                        "media:community": { "media:statistics$attrs": { views: "10" } }
                    }
                }
            }
        };

        const results = youtubeLoad(feed, channelInfo);
        expect(results).toHaveLength(1);
        // Empty string description should not produce HTML body
        expect(results[0].body).toBeNull();
    });

    test('handles media:thumbnail without width/height', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:noSize",
                    "yt:videoId": "noSize",
                    title: "No Thumbnail Size",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=noSize" },
                    "media:group": {
                        "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/noSize/hqdefault.jpg" },
                        "media:community": { "media:statistics$attrs": { views: "5" } }
                    }
                }
            }
        };

        const results = youtubeLoad(feed, channelInfo);
        expect(results[0].attachments).toHaveLength(1);
        expect(results[0].attachments[0]._type).toBe('link');
        expect(results[0].attachments[0].url).toBe('https://www.youtube.com/watch?v=noSize');
        expect(results[0].attachments[0].image).toBe('https://i.ytimg.com/vi/noSize/hqdefault.jpg');
        expect(results[0].attachments[0].aspectSize).toBeNull();
    });

    test('handles entry without media:community (no view count)', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:noViews",
                    "yt:videoId": "noViews",
                    title: "No View Count",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=noViews" },
                    "media:group": {
                        "media:description": "No views data",
                        "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/noViews/hqdefault.jpg" }
                    }
                }
            }
        };

        const results = youtubeLoad(feed, channelInfo);
        expect(results).toHaveLength(1);
        expect(results[0].annotations).toBeNull();
    });

    test('description with special HTML characters is escaped', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:htmlChars",
                    "yt:videoId": "htmlChars",
                    title: "HTML Characters",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=htmlChars" },
                    "media:group": {
                        "media:description": "Use code <SAVE10> & get 10% off!",
                        "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/htmlChars/hqdefault.jpg" },
                        "media:community": { "media:statistics$attrs": { views: "100" } }
                    }
                }
            }
        };

        const results = youtubeLoad(feed, channelInfo);
        expect(results[0].body).toContain('&amp;');
        expect(results[0].body).toContain('&lt;SAVE10&gt;');
        // Should not contain raw < or > (except in HTML tags)
        expect(results[0].body).not.toMatch(/<SAVE10>/);
    });

    test('channelInfo without avatar still works', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:noAvatar",
                    "yt:videoId": "noAvatar",
                    title: "No Avatar",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=noAvatar" }
                }
            }
        };

        const infoNoAvatar = { channelId: 'UCtest', channelName: 'Test', channelAvatar: null };
        const results = youtubeLoad(feed, infoNoAvatar);
        expect(results).toHaveLength(1);
        expect(results[0].author.avatar).toBeNull();
    });

    test('formatViewCount edge case: exactly 10000', () => {
        expect(formatViewCount(10000)).toBe("10K views");
    });

    test('formatViewCount edge case: 9999', () => {
        expect(formatViewCount(9999)).toBe("10.0K views");
    });

    test('linkifyUrls wraps bare URLs in <a> tags', () => {
        const input = '<p>Check out https://example.com/page for more info</p>';
        const result = linkifyUrls(input);
        expect(result).toBe('<p>Check out <a href="https://example.com/page">https://example.com/page</a> for more info</p>');
    });

    test('linkifyUrls handles multiple URLs', () => {
        const input = '<p>https://one.com and https://two.com</p>';
        const result = linkifyUrls(input);
        expect(result).toContain('<a href="https://one.com">https://one.com</a>');
        expect(result).toContain('<a href="https://two.com">https://two.com</a>');
    });

    test('linkifyUrls does not double-wrap existing links', () => {
        const input = '<p><a href="https://example.com">click here</a></p>';
        const result = linkifyUrls(input);
        // The href URL should not get re-wrapped
        expect(result).toBe(input);
    });

    test('body URLs become clickable links in youtubeLoad output', () => {
        const feed = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:urlBody",
                    "yt:videoId": "urlBody",
                    title: "URL in Body",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=urlBody" },
                    "media:group": {
                        "media:description": "Visit https://example.com for more",
                        "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/urlBody/hqdefault.jpg" },
                        "media:community": { "media:statistics$attrs": { views: "50" } }
                    }
                }
            }
        };

        const results = youtubeLoad(feed, channelInfo);
        expect(results[0].body).toContain('<a href="https://example.com">https://example.com</a>');
    });
});
