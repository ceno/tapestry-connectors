// youtubeLoad.test.js - Integration tests for feed parsing

require('../youtube.feed.test/mocks/tapestry');
const { youtubeLoad } = require('../youtube.feed/resources/youtube-shared');

// Load test fixture
const feedJson = require('./fixtures/test-atom-feed.json');
const singleEntryJson = require('./fixtures/single-entry-feed.json');

const channelInfo = {
    channelId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
    channelName: 'MrBeast',
    channelAvatar: 'https://yt3.googleusercontent.com/ytc/avatar.jpg'
};

describe('youtubeLoad', () => {
    test('parses feed with multiple entries', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        expect(results).toHaveLength(3);
    });

    test('extracts video URI from link element', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        expect(results[0].uri).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(results[1].uri).toBe('https://www.youtube.com/watch?v=abc123def45');
        expect(results[2].uri).toBe('https://www.youtube.com/watch?v=xyz789short');
    });

    test('extracts video title', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        expect(results[0].title).toBe('$456,000 Squid Game In Real Life!');
        expect(results[1].title).toBe('I Built 100 Wells In Africa');
    });

    test('extracts publish date', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        expect(results[0].date).toEqual(new Date('2021-11-24T17:00:14+00:00'));
        expect(results[1].date).toEqual(new Date('2023-10-28T16:00:00+00:00'));
    });

    test('extracts and converts description to HTML body', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        // First entry - has double newlines for paragraph breaks
        expect(results[0].body).toContain('<p>');
        expect(results[0].body).toContain('Squid Game');
        expect(results[0].body).toContain('</p>');
        // Should have paragraph breaks from double newlines
        expect(results[0].body).toContain('</p><p>');
    });

    test('escapes HTML entities in description', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        // The body should escape special HTML characters
        expect(results[0].body).not.toContain('&amp;amp;'); // Should not double-escape
    });

    test('creates video LinkAttachment with thumbnail', () => {
        const results = youtubeLoad(feedJson, channelInfo);
        expect(results[0].attachments).toHaveLength(1);

        const link = results[0].attachments[0];
        expect(link._type).toBe('link');
        expect(link.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(link.title).toBe('$456,000 Squid Game In Real Life!');
        expect(link.siteName).toBe('YouTube');
        expect(link.image).toBe('https://i1.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
        expect(link.aspectSize).toEqual({ width: 480, height: 360 });
    });

    test('creates view count Annotation', () => {
        const results = youtubeLoad(feedJson, channelInfo);

        // First entry: 324,567,890 views → "324M views"
        expect(results[0].annotations).toHaveLength(1);
        expect(results[0].annotations[0].text).toBe('324M views');
        expect(results[0].annotations[0].uri).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        // Second entry: 57,540,434 views → "57M views"
        expect(results[1].annotations[0].text).toBe('57M views');

        // Third entry: 1,234 views → "1.2K views"
        expect(results[2].annotations[0].text).toBe('1.2K views');
    });

    test('creates Identity with channel info', () => {
        const results = youtubeLoad(feedJson, channelInfo);

        const author = results[0].author;
        expect(author.name).toBe('MrBeast');
        expect(author.username).toBe('@MrBeast');
        expect(author.uri).toBe('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(author.avatar).toBe('https://yt3.googleusercontent.com/ytc/avatar.jpg');
    });

    test('handles single entry (not wrapped in array)', () => {
        const results = youtubeLoad(singleEntryJson, {
            channelId: 'UCsingleEntry123456789',
            channelName: 'Single Entry Channel',
            channelAvatar: null
        });

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('The Only Video');
        expect(results[0].uri).toBe('https://www.youtube.com/watch?v=singleVid01');
        expect(results[0].annotations[0].text).toBe('42 views');
    });

    test('returns empty array for non-feed object', () => {
        const results = youtubeLoad({}, channelInfo);
        expect(results).toEqual([]);
    });

    test('returns empty array for feed with no entries', () => {
        const emptyFeed = {
            feed: {
                title: "Empty Channel",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCempty" }
            }
        };
        const results = youtubeLoad(emptyFeed, channelInfo);
        expect(results).toEqual([]);
    });

    test('skips entries without yt:videoId', () => {
        const feedWithBadEntry = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: [
                    {
                        id: "yt:video:goodVideo",
                        "yt:videoId": "goodVideo",
                        title: "Good Video",
                        published: "2024-01-01T00:00:00Z",
                        link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=goodVideo" },
                        "media:group": {
                            "media:description": "Good video description",
                            "media:thumbnail$attrs": { url: "https://i.ytimg.com/vi/goodVideo/hqdefault.jpg", width: "480", height: "360" },
                            "media:community": { "media:statistics$attrs": { views: "100" } }
                        }
                    },
                    {
                        id: "bad-entry",
                        title: "No Video ID"
                    }
                ]
            }
        };

        const results = youtubeLoad(feedWithBadEntry, channelInfo);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Good Video');
    });

    test('handles entry without media:group', () => {
        const feedNoMedia = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:noMedia",
                    "yt:videoId": "noMedia",
                    title: "No Media",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=noMedia" }
                }
            }
        };

        const results = youtubeLoad(feedNoMedia, channelInfo);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('No Media');
        expect(results[0].body).toBeNull();
        // LinkAttachment is always created (even without thumbnail)
        expect(results[0].attachments).toHaveLength(1);
        expect(results[0].attachments[0]._type).toBe('link');
        expect(results[0].attachments[0].url).toBe('https://www.youtube.com/watch?v=noMedia');
        expect(results[0].attachments[0].image).toBeNull();
        expect(results[0].annotations).toBeNull();
    });

    test('uses "updated" date when "published" is missing', () => {
        const feedUpdatedOnly = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:updatedOnly",
                    "yt:videoId": "updatedOnly",
                    title: "Updated Only",
                    updated: "2024-05-01T12:00:00Z",
                    link$attrs: { rel: "alternate", href: "https://www.youtube.com/watch?v=updatedOnly" }
                }
            }
        };

        const results = youtubeLoad(feedUpdatedOnly, channelInfo);
        expect(results[0].date).toEqual(new Date('2024-05-01T12:00:00Z'));
    });

    test('constructs videoUri from videoId when no link element', () => {
        const feedNoLink = {
            feed: {
                title: "Test",
                link$attrs: { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" },
                author: { name: "Test" },
                entry: {
                    id: "yt:video:noLink123",
                    "yt:videoId": "noLink123",
                    title: "No Link",
                    published: "2024-01-01T00:00:00Z"
                }
            }
        };

        const results = youtubeLoad(feedNoLink, channelInfo);
        expect(results[0].uri).toBe('https://www.youtube.com/watch?v=noLink123');
    });

    test('handles link$attrs as array', () => {
        const feedMultipleLinks = {
            feed: {
                title: "Test",
                link$attrs: [
                    { rel: "self", href: "https://www.youtube.com/feeds/videos.xml?channel_id=UCtest" },
                    { rel: "alternate", href: "https://www.youtube.com/channel/UCtest" }
                ],
                author: { name: "Test" },
                entry: {
                    id: "yt:video:multiLink",
                    "yt:videoId": "multiLink",
                    title: "Multiple Links",
                    published: "2024-01-01T00:00:00Z",
                    link$attrs: [
                        { rel: "self", href: "https://www.youtube.com/feeds/videos.xml?video_id=multiLink" },
                        { rel: "alternate", href: "https://www.youtube.com/watch?v=multiLink" }
                    ]
                }
            }
        };

        const results = youtubeLoad(feedMultipleLinks, channelInfo);
        expect(results[0].uri).toBe('https://www.youtube.com/watch?v=multiLink');
    });
});
