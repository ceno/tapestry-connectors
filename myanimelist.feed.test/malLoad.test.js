// malLoad.test.js - Integration tests for feed parsing

require('./mocks/tapestry');
const { malLoad } = require('../myanimelist.feed/resources/myanimelist-shared');

const animeFeed = require('./fixtures/sample-rw.json');
const mangaFeed = require('./fixtures/sample-rm.json');

const userInfo = {
    username: 'Xinil',
    avatar: 'https://cdn.myanimelist.net/images/userimages/1.jpg'
};

describe('malLoad', () => {
    test('parses all entries from the anime feed', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results).toHaveLength(15);
    });

    test('parses all entries from the manga feed', () => {
        const results = malLoad(mangaFeed, userInfo, {});
        expect(results).toHaveLength(15);
    });

    test('builds a unique URI from the link and update timestamp', () => {
        const results = malLoad(animeFeed, userInfo, {});
        const date = new Date('Mon, 19 Apr 2021 14:44:42 -0700');
        expect(results[0].uri).toBe(`https://myanimelist.net/anime/21/One_Piece#${date.getTime()}`);

        const uris = results.map(r => r.uri);
        expect(new Set(uris).size).toBe(uris.length);
    });

    test('parses the pubDate', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results[0].date).toEqual(new Date('Mon, 19 Apr 2021 14:44:42 -0700'));
    });

    test('uses the RSS title', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results[0].title).toBe('One Piece - TV');
    });

    test('wraps the description in an HTML-escaped paragraph', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results[0].body).toBe('<p>Watching - 623 of ? episodes</p>');
    });

    test('escapes HTML entities in the description', () => {
        const feed = {
            rss: {
                channel: {
                    title: "Xinil's Anime from MyAnimeList.net",
                    item: {
                        title: 'Test',
                        link: 'https://myanimelist.net/anime/1/Test',
                        description: 'Watching - 1 of <2> "episodes" & more',
                        pubDate: 'Mon, 19 Apr 2021 14:44:42 -0700'
                    }
                }
            }
        };
        const results = malLoad(feed, userInfo, {});
        expect(results[0].body).toBe('<p>Watching - 1 of &lt;2&gt; &quot;episodes&quot; &amp; more</p>');
    });

    test('attaches a LinkAttachment pointing at the title page when no cover is cached', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results[0].attachments).toHaveLength(1);
        const link = results[0].attachments[0];
        expect(link._type).toBe('link');
        expect(link.url).toBe('https://myanimelist.net/anime/21/One_Piece');
        expect(link.siteName).toBe('MyAnimeList');
    });

    test('attaches a MediaAttachment when a cover is cached for the title', () => {
        const covers = { 'anime/21': 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg' };
        const results = malLoad(animeFeed, userInfo, { covers });
        const media = results[0].attachments[0];
        expect(media._type).toBe('media');
        expect(media.url).toBe('https://cdn.myanimelist.net/images/anime/6/73245l.jpg');
        expect(media.text).toBe('Cover art for One Piece - TV');

        // Titles without a cached cover still fall back to a link
        expect(results[1].attachments[0]._type).toBe('link');
    });

    test('adds the list status as an Annotation', () => {
        const results = malLoad(animeFeed, userInfo, {});
        expect(results[0].annotations).toHaveLength(1);
        expect(results[0].annotations[0].text).toBe('Watching');
        expect(results[0].annotations[0].uri).toBe('https://myanimelist.net/anime/21/One_Piece');

        const completed = results.find(r => r.title === 'Hunter x Hunter (2011) - TV');
        expect(completed.annotations[0].text).toBe('Completed');
    });

    test('sets the author identity from the username', () => {
        const results = malLoad(animeFeed, userInfo, {});
        const author = results[0].author;
        expect(author.name).toBe('Xinil');
        expect(author.username).toBe('@Xinil');
        expect(author.uri).toBe('https://myanimelist.net/profile/Xinil');
        expect(author.avatar).toBe(userInfo.avatar);
    });

    test('handles a single-item feed (xmlParse returns an object, not array)', () => {
        const single = {
            rss: {
                channel: {
                    title: "Xinil's Anime from MyAnimeList.net",
                    item: animeFeed.rss.channel.item[0]
                }
            }
        };
        const results = malLoad(single, userInfo, {});
        expect(results).toHaveLength(1);
    });

    test('returns empty array for a feed with no items', () => {
        const empty = { rss: { channel: { title: "Xinil's Anime from MyAnimeList.net" } } };
        expect(malLoad(empty, userInfo, {})).toEqual([]);
    });

    test('throws a useful error for an unexpected response', () => {
        expect(() => malLoad({}, userInfo, {})).toThrow(/private|username/i);
    });
});
