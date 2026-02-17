// buildFeedUrl.test.js - Tests for feed URL construction

require('../youtube.feed.test/mocks/tapestry');
const { buildFeedUrl } = require('../youtube.feed/resources/youtube-shared');

describe('buildFeedUrl', () => {
    const channelId = 'UCX6OQ3DkcsbYNE6H8uQQuVA';
    const baseId = 'X6OQ3DkcsbYNE6H8uQQuVA'; // channelId without "UC" prefix

    test('builds "All content" feed URL with channel_id', () => {
        const url = buildFeedUrl(channelId, 'All content');
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    });

    test('builds "Videos only" feed URL with UULF prefix', () => {
        const url = buildFeedUrl(channelId, 'Videos only');
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${baseId}`);
    });

    test('builds "Shorts only" feed URL with UUSH prefix', () => {
        const url = buildFeedUrl(channelId, 'Shorts only');
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=UUSH${baseId}`);
    });

    test('builds "Live streams only" feed URL with UULV prefix', () => {
        const url = buildFeedUrl(channelId, 'Live streams only');
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?playlist_id=UULV${baseId}`);
    });

    test('defaults to "all" for unknown content type', () => {
        const url = buildFeedUrl(channelId, 'something unexpected');
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    });

    test('defaults to "all" for undefined content type', () => {
        const url = buildFeedUrl(channelId, undefined);
        expect(url).toBe(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    });

    test('correctly strips UC prefix from different channel IDs', () => {
        const testId = 'UC1234567890abcdefghij';
        const url = buildFeedUrl(testId, 'Videos only');
        expect(url).toBe('https://www.youtube.com/feeds/videos.xml?playlist_id=UULF1234567890abcdefghij');
    });
});
