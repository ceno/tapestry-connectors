// helpers.test.js - Unit tests for anilist-shared helper functions

require('./mocks/tapestry');
const {
    ACTIVITY_TYPE_MAP,
    USER_QUERY,
    cleanUsername,
    graphqlBody,
    parseGraphqlResponse,
    parseUser,
    escapeHtml,
    formatListActivityBody,
    extractImages
} = require('../anilist.feed/resources/anilist-shared');

const userResponse = require('./fixtures/user-response.json');

describe('cleanUsername', () => {
    test('accepts a plain username and preserves case', () => {
        expect(cleanUsername('PotatoWithThoughts')).toBe('PotatoWithThoughts');
    });

    test('strips a leading @', () => {
        expect(cleanUsername('@PotatoWithThoughts')).toBe('PotatoWithThoughts');
    });

    test('extracts the username from a profile URL', () => {
        expect(cleanUsername('https://anilist.co/user/PotatoWithThoughts/')).toBe('PotatoWithThoughts');
        expect(cleanUsername('anilist.co/user/PotatoWithThoughts')).toBe('PotatoWithThoughts');
    });

    test('trims whitespace', () => {
        expect(cleanUsername('  PotatoWithThoughts ')).toBe('PotatoWithThoughts');
    });

    test('throws for empty input', () => {
        expect(() => cleanUsername(null)).toThrow(/username/i);
        expect(() => cleanUsername('')).toThrow(/username/i);
    });

    test('throws for invalid characters', () => {
        expect(() => cleanUsername('not a user name!')).toThrow(/valid/i);
    });
});

describe('graphqlBody', () => {
    test('serializes query and variables', () => {
        const body = graphqlBody('query { x }', { userId: 42 });
        expect(JSON.parse(body)).toEqual({ query: 'query { x }', variables: { userId: 42 } });
    });

    test('defaults to empty variables', () => {
        expect(JSON.parse(graphqlBody('query { x }'))).toEqual({ query: 'query { x }', variables: {} });
    });
});

describe('parseGraphqlResponse', () => {
    test('returns the data payload', () => {
        expect(parseGraphqlResponse({ data: { ok: true } })).toEqual({ ok: true });
    });

    test('parses string responses', () => {
        expect(parseGraphqlResponse('{"data":{"ok":true}}')).toEqual({ ok: true });
    });

    test('throws the first GraphQL error', () => {
        const response = { errors: [{ message: 'Too Many Requests.', status: 429 }], data: null };
        expect(() => parseGraphqlResponse(response)).toThrow(/Too Many Requests/);
    });

    test('throws when data is missing', () => {
        expect(() => parseGraphqlResponse({})).toThrow(/unexpected/i);
    });
});

describe('parseUser', () => {
    test('parses the fixture user', () => {
        const user = parseUser(userResponse);
        expect(user.id).toBe(6257216);
        expect(user.name).toBe('PotatoWithThoughts');
        expect(user.avatar).toBe('https://s4.anilist.co/file/anilistcdn/user/avatar/large/b6257216-ARckkBo9FLI8.png');
        expect(user.siteUrl).toBe('https://anilist.co/user/6257216');
    });

    test('gives a friendly error for unknown users', () => {
        const notFound = { errors: [{ message: 'Not Found.', status: 404 }], data: { User: null } };
        expect(() => parseUser(notFound)).toThrow(/user not found/i);
        expect(() => parseUser({ data: { User: null } })).toThrow(/user not found/i);
    });
});

describe('escapeHtml', () => {
    test('escapes special characters', () => {
        expect(escapeHtml('Steins;Gate <& "Zero">')).toBe('Steins;Gate &lt;&amp; &quot;Zero&quot;&gt;');
    });
});

describe('formatListActivityBody', () => {
    test('capitalizes the status and includes progress', () => {
        expect(formatListActivityBody('watched episode', '5', 'Frieren', 'https://anilist.co/anime/1'))
            .toBe('<p><b>Watched episode</b> 5 of <a href="https://anilist.co/anime/1">Frieren</a></p>');
    });

    test('handles progress ranges', () => {
        expect(formatListActivityBody('read chapter', '1 - 118', 'Title', 'https://anilist.co/manga/2'))
            .toBe('<p><b>Read chapter</b> 1 - 118 of <a href="https://anilist.co/manga/2">Title</a></p>');
    });

    test('omits "of" when there is no progress', () => {
        expect(formatListActivityBody('plans to watch', null, 'Frieren', 'https://anilist.co/anime/1'))
            .toBe('<p><b>Plans to watch</b> <a href="https://anilist.co/anime/1">Frieren</a></p>');
    });

    test('escapes HTML in titles', () => {
        const body = formatListActivityBody('completed', null, 'Fate/stay night <Heaven\'s Feel>', 'https://anilist.co/anime/3');
        expect(body).toContain('&lt;Heaven\'s Feel&gt;');
        expect(body).not.toContain('<Heaven');
    });

    test('falls back when status or url are missing', () => {
        expect(formatListActivityBody(null, null, 'Title', null)).toBe('<p><b>Updated</b> Title</p>');
    });
});

describe('extractImages', () => {
    test('extracts images and removes image-only paragraphs', () => {
        const html = '<p><img src="https://a.com/1.jpg"/></p><p>Words</p>';
        expect(extractImages(html)).toEqual({ images: ['https://a.com/1.jpg'], body: '<p>Words</p>' });
    });

    test('handles empty input', () => {
        expect(extractImages(null)).toEqual({ images: [], body: '' });
    });
});

describe('configuration constants', () => {
    test('activity type map matches the ui-config choices', () => {
        const uiConfig = require('../anilist.feed/ui-config.json');
        const choicesInput = uiConfig.inputs.find(i => i.name === 'activityType');
        const choices = choicesInput.choices.split(',').map(c => c.trim());
        expect(Object.keys(ACTIVITY_TYPE_MAP).sort()).toEqual(choices.sort());
        expect(ACTIVITY_TYPE_MAP['List updates only']).toBe('MEDIA_LIST');
        expect(ACTIVITY_TYPE_MAP['Posts only']).toBe('TEXT');
        expect(ACTIVITY_TYPE_MAP['All activity']).toBeNull();
    });

    test('user query asks for the fields verify() needs', () => {
        expect(USER_QUERY).toContain('id');
        expect(USER_QUERY).toContain('avatar { large }');
        expect(USER_QUERY).toContain('siteUrl');
    });
});
