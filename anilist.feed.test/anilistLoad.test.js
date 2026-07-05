// anilistLoad.test.js - Integration tests for activity feed parsing

require('./mocks/tapestry');
const { anilistLoad } = require('../anilist.feed/resources/anilist-shared');

const activitiesResponse = require('./fixtures/activities-response.json');

// The fixture holds 24 ListActivity entries plus one MessageActivity stub
// (no fields queried for messages, so it must be skipped by the parser).

function makeUser() {
    return {
        name: 'PotatoWithThoughts',
        avatar: { large: 'https://s4.anilist.co/file/anilistcdn/user/avatar/large/b6257216-ARckkBo9FLI8.png' },
        siteUrl: 'https://anilist.co/user/6257216'
    };
}

function makeTextActivity(overrides) {
    return Object.assign({
        __typename: 'TextActivity',
        id: 123456,
        text: '<p>Just finished my rewatch. Incredible show.</p>',
        createdAt: 1783000000,
        siteUrl: 'https://anilist.co/activity/123456',
        user: makeUser()
    }, overrides);
}

describe('anilistLoad', () => {
    test('parses all usable activities from the fixture', () => {
        const results = anilistLoad(activitiesResponse, {});
        expect(results).toHaveLength(24);
    });

    test('skips activity types without queried fields (messages)', () => {
        const stubs = activitiesResponse.data.Page.activities.filter(a => a.__typename === 'MessageActivity');
        expect(stubs.length).toBeGreaterThan(0);
        const results = anilistLoad(activitiesResponse, {});
        expect(results.every(r => r.uri.startsWith('https://anilist.co/activity/'))).toBe(true);
    });

    test('uses the activity siteUrl as URI', () => {
        const results = anilistLoad(activitiesResponse, {});
        expect(results[0].uri).toBe('https://anilist.co/activity/1106559205');
    });

    test('converts createdAt seconds to a Date', () => {
        const results = anilistLoad(activitiesResponse, {});
        expect(results[0].date).toEqual(new Date(1783246983 * 1000));
    });

    test('phrases a read chapter update', () => {
        const results = anilistLoad(activitiesResponse, {});
        expect(results[0].body).toBe(
            '<p><b>Read chapter</b> 1 - 118 of <a href="https://anilist.co/manga/180761">Mo Ri Hen Ren: Kai Ju Tun Ji Wanyi Wuzi</a></p>'
        );
    });

    test('phrases a watched episode update', () => {
        const results = anilistLoad(activitiesResponse, {});
        const xianNi = results.find(r => r.body && r.body.includes('Xian Ni'));
        expect(xianNi.body).toBe(
            '<p><b>Watched episode</b> 1 - 146 of <a href="https://anilist.co/anime/137653">Xian Ni</a></p>'
        );
    });

    test('attaches cover art with alt text', () => {
        const results = anilistLoad(activitiesResponse, {});
        const item = results[0];
        expect(item.attachments).toHaveLength(1);
        expect(item.attachments[0]._type).toBe('media');
        expect(item.attachments[0].url).toBe('https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx180761-sxeUm8IZabiv.jpg');
        expect(item.attachments[0].text).toBe('Cover art for Mo Ri Hen Ren: Kai Ju Tun Ji Wanyi Wuzi');
    });

    test('sets the author identity from the activity user', () => {
        const results = anilistLoad(activitiesResponse, {});
        const author = results[0].author;
        expect(author.name).toBe('PotatoWithThoughts');
        expect(author.username).toBe('@PotatoWithThoughts');
        expect(author.uri).toBe('https://anilist.co/user/6257216');
        expect(author.avatar).toBe('https://s4.anilist.co/file/anilistcdn/user/avatar/large/b6257216-ARckkBo9FLI8.png');
    });

    test('annotates manga and anime updates', () => {
        const results = anilistLoad(activitiesResponse, {});
        expect(results[0].annotations.map(a => a.text)).toEqual(['Manga']);
        expect(results[0].annotations[0].uri).toBe('https://anilist.co/manga/180761');

        const anime = results.find(r => r.annotations && r.annotations[0].text === 'Anime');
        expect(anime).toBeDefined();
        expect(anime.annotations[0].uri).toBe('https://anilist.co/anime/137653');
    });

    test('parses a text activity into an HTML body post', () => {
        const response = { data: { Page: { activities: [makeTextActivity()] } } };
        const results = anilistLoad(response, {});
        expect(results).toHaveLength(1);
        expect(results[0].uri).toBe('https://anilist.co/activity/123456');
        expect(results[0].body).toBe('<p>Just finished my rewatch. Incredible show.</p>');
        expect(results[0].author.name).toBe('PotatoWithThoughts');
        expect(results[0].attachments).toBeNull();
    });

    test('extracts inline images from text activities into attachments', () => {
        const activity = makeTextActivity({
            text: '<p><img src="https://s4.anilist.co/file/screenshot.jpg"/></p><p>Look at this scene!</p>'
        });
        const response = { data: { Page: { activities: [activity] } } };
        const results = anilistLoad(response, {});
        expect(results[0].body).toBe('<p>Look at this scene!</p>');
        expect(results[0].attachments).toHaveLength(1);
        expect(results[0].attachments[0].url).toBe('https://s4.anilist.co/file/screenshot.jpg');
    });

    test('accepts a raw JSON string response', () => {
        const results = anilistLoad(JSON.stringify(activitiesResponse), {});
        expect(results).toHaveLength(24);
    });

    test('returns empty array when the page has no activities', () => {
        expect(anilistLoad({ data: { Page: { activities: [] } } }, {})).toEqual([]);
        expect(anilistLoad({ data: { Page: null } }, {})).toEqual([]);
    });

    test('throws for a GraphQL error response', () => {
        const errorResponse = { errors: [{ message: 'Not Found.', status: 404 }], data: { Page: null } };
        expect(() => anilistLoad(errorResponse, {})).toThrow(/Not Found/);
    });
});
