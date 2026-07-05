// letterboxdLoad.test.js - Integration tests for feed parsing

require('./mocks/tapestry');
const { letterboxdLoad, ENTRY_TYPE_MAP } = require('../letterboxd.feed/resources/letterboxd-shared');

const watchFeed = require('./fixtures/sample-feed.json');
const reviewFeed = require('./fixtures/sample-reviews-feed.json');

const userInfo = {
    username: 'dave',
    displayName: null,
    avatar: 'https://a.ltrbxd.com/resized/avatar/dave.jpg'
};

describe('letterboxdLoad', () => {
    test('parses all entries from a watch feed', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        expect(results).toHaveLength(100);
    });

    test('uses the diary entry link as URI', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        expect(results[0].uri).toBe('https://letterboxd.com/dave/film/toy-story-4/1/');
    });

    test('parses the pubDate', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        expect(results[0].date).toEqual(new Date('Sat, 27 Jun 2026 00:17:04 +1200'));
    });

    test('keeps the star rating in the title', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        expect(results[0].title).toBe('Toy Story 4, 2019 - ★★★½');
    });

    test('removes the poster from the body and attaches it as media', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        const item = results[0];
        expect(item.body).not.toContain('<img');
        expect(item.attachments).toHaveLength(1);
        expect(item.attachments[0]._type).toBe('media');
        expect(item.attachments[0].url).toContain('film-poster');
        expect(item.attachments[0].aspectSize).toEqual({ width: 600, height: 900 });
        expect(item.attachments[0].text).toBe('Poster for Toy Story 4');
    });

    test('sets the author identity from dc:creator', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        const author = results[0].author;
        expect(author.name).toBe('Dave Vis');
        expect(author.username).toBe('@dave');
        expect(author.uri).toBe('https://letterboxd.com/dave/');
        expect(author.avatar).toBe(userInfo.avatar);
    });

    test('adds a Rewatch annotation for rewatches', () => {
        const results = letterboxdLoad(watchFeed, userInfo, {});
        const rewatch = results.find(r => r.uri.includes('toy-story-4'));
        expect(rewatch.annotations.map(a => a.text)).toContain('Rewatch');
    });

    test('adds a Review annotation for review entries', () => {
        const results = letterboxdLoad(reviewFeed, { ...userInfo, username: 'davidehrlich' }, {});
        const review = results.find(r => r.annotations && r.annotations.some(a => a.text === 'Review'));
        expect(review).toBeDefined();
        expect(review.body).toBeTruthy();
    });

    test('review body keeps the review text paragraphs', () => {
        const results = letterboxdLoad(reviewFeed, { ...userInfo, username: 'davidehrlich' }, {});
        const camp = results.find(r => r.title && r.title.startsWith('CAMP'));
        expect(camp.body).toContain('Ambiently queer');
        expect(camp.body).not.toContain('<img');
    });

    test('filters to reviews only', () => {
        const all = letterboxdLoad(reviewFeed, userInfo, {});
        const reviewsOnly = letterboxdLoad(reviewFeed, userInfo, { entryTypes: ENTRY_TYPE_MAP['Reviews only'] });
        expect(reviewsOnly.length).toBeGreaterThan(0);
        expect(reviewsOnly.length).toBeLessThan(all.length);
        for (const item of reviewsOnly) {
            expect(item.annotations.map(a => a.text)).toContain('Review');
        }
    });

    test('handles a single-item feed (xmlParse returns an object, not array)', () => {
        const single = {
            rss: {
                channel: {
                    title: 'Letterboxd - Dave Vis',
                    item: watchFeed.rss.channel.item[0]
                }
            }
        };
        const results = letterboxdLoad(single, userInfo, {});
        expect(results).toHaveLength(1);
    });

    test('returns empty array for a feed with no items', () => {
        const empty = { rss: { channel: { title: 'Letterboxd - Nobody' } } };
        expect(letterboxdLoad(empty, userInfo, {})).toEqual([]);
    });

    test('throws a useful error for an unexpected response', () => {
        expect(() => letterboxdLoad({}, userInfo, {})).toThrow(/username/i);
    });
});
