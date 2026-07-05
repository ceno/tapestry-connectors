// helpers.test.js - Unit tests for myanimelist-shared helper functions

require('./mocks/tapestry');
const {
    cleanUsername,
    buildFeedUrl,
    parseChannelTitle,
    extractAvatarFromProfileHtml,
    parseStatus,
    escapeHtml,
    LIST_TYPE_MAP
} = require('../myanimelist.feed/resources/myanimelist-shared');

describe('cleanUsername', () => {
    test('accepts a plain username', () => {
        expect(cleanUsername('Xinil')).toBe('Xinil');
    });

    test('strips a leading @', () => {
        expect(cleanUsername('@Xinil')).toBe('Xinil');
    });

    test('extracts the username from a profile URL', () => {
        expect(cleanUsername('https://myanimelist.net/profile/Xinil')).toBe('Xinil');
        expect(cleanUsername('myanimelist.net/profile/Xinil/')).toBe('Xinil');
    });

    test('preserves case', () => {
        expect(cleanUsername('SomeUser_123')).toBe('SomeUser_123');
    });

    test('trims whitespace', () => {
        expect(cleanUsername('  Xinil ')).toBe('Xinil');
    });

    test('throws for empty input', () => {
        expect(() => cleanUsername(null)).toThrow(/username/i);
        expect(() => cleanUsername('')).toThrow(/username/i);
    });

    test('throws for invalid characters', () => {
        expect(() => cleanUsername('not a user name!')).toThrow(/valid/i);
    });
});

describe('buildFeedUrl', () => {
    test('builds the anime RSS URL', () => {
        expect(buildFeedUrl('Xinil', 'rw')).toBe('https://myanimelist.net/rss.php?type=rw&u=Xinil');
    });

    test('builds the manga RSS URL', () => {
        expect(buildFeedUrl('Xinil', 'rm')).toBe('https://myanimelist.net/rss.php?type=rm&u=Xinil');
    });
});

describe('LIST_TYPE_MAP', () => {
    test('maps choices to feed types', () => {
        expect(LIST_TYPE_MAP['Anime']).toEqual(['rw']);
        expect(LIST_TYPE_MAP['Manga']).toEqual(['rm']);
        expect(LIST_TYPE_MAP['Anime and manga']).toEqual(['rw', 'rm']);
    });
});

describe('parseChannelTitle', () => {
    test('strips the anime suffix', () => {
        expect(parseChannelTitle("Xinil's Anime from MyAnimeList.net")).toBe('Xinil');
    });

    test('strips the manga suffix', () => {
        expect(parseChannelTitle("Xinil's Manga from MyAnimeList.net")).toBe('Xinil');
    });

    test('falls back to the full title for unexpected formats', () => {
        expect(parseChannelTitle('Something else')).toBe('Something else');
    });

    test('returns null for empty input', () => {
        expect(parseChannelTitle(null)).toBeNull();
        expect(parseChannelTitle('')).toBeNull();
    });
});

describe('extractAvatarFromProfileHtml', () => {
    test('finds og:image with property first', () => {
        const html = '<meta property="og:image" content="https://cdn.myanimelist.net/images/userimages/1.jpg">';
        expect(extractAvatarFromProfileHtml(html)).toBe('https://cdn.myanimelist.net/images/userimages/1.jpg');
    });

    test('finds og:image with content first', () => {
        const html = '<meta content="https://cdn.myanimelist.net/images/userimages/1.jpg" property="og:image">';
        expect(extractAvatarFromProfileHtml(html)).toBe('https://cdn.myanimelist.net/images/userimages/1.jpg');
    });

    test('returns null when missing', () => {
        expect(extractAvatarFromProfileHtml('<html></html>')).toBeNull();
        expect(extractAvatarFromProfileHtml(null)).toBeNull();
    });
});

describe('parseStatus', () => {
    test('parses common statuses', () => {
        expect(parseStatus('Watching - 623 of ? episodes')).toBe('Watching');
        expect(parseStatus('Completed - 148 of 148 episodes')).toBe('Completed');
        expect(parseStatus('Plan to Watch - 0 of 3 episodes')).toBe('Plan to Watch');
        expect(parseStatus('Reading - 92 of ? chapters')).toBe('Reading');
    });

    test('returns the whole string when there is no separator', () => {
        expect(parseStatus('On-Hold')).toBe('On-Hold');
    });

    test('returns null for empty input', () => {
        expect(parseStatus('')).toBeNull();
        expect(parseStatus(null)).toBeNull();
    });
});

describe('escapeHtml', () => {
    test('escapes special characters', () => {
        expect(escapeHtml('<b>"A & B"</b>')).toBe('&lt;b&gt;&quot;A &amp; B&quot;&lt;/b&gt;');
    });
});

const { extractMalEntry, jikanUrl, parseJikanCover } = require('../myanimelist.feed/resources/myanimelist-shared');

describe('extractMalEntry', () => {
    test('extracts anime type and id', () => {
        expect(extractMalEntry('https://myanimelist.net/anime/21/One_Piece')).toEqual({ type: 'anime', id: '21' });
    });

    test('extracts manga type and id', () => {
        expect(extractMalEntry('https://myanimelist.net/manga/2/Berserk')).toEqual({ type: 'manga', id: '2' });
    });

    test('returns null for other URLs', () => {
        expect(extractMalEntry('https://myanimelist.net/profile/Xinil')).toBeNull();
        expect(extractMalEntry(null)).toBeNull();
    });
});

describe('jikanUrl', () => {
    test('builds the Jikan endpoint', () => {
        expect(jikanUrl({ type: 'anime', id: '21' })).toBe('https://api.jikan.moe/v4/anime/21');
    });
});

describe('parseJikanCover', () => {
    test('prefers the large jpg image', () => {
        const json = { data: { images: { jpg: { image_url: 'small.jpg', large_image_url: 'large.jpg' } } } };
        expect(parseJikanCover(json)).toBe('large.jpg');
    });

    test('falls back to the regular jpg image', () => {
        const json = { data: { images: { jpg: { image_url: 'small.jpg' } } } };
        expect(parseJikanCover(json)).toBe('small.jpg');
    });

    test('returns null for malformed responses', () => {
        expect(parseJikanCover({})).toBeNull();
        expect(parseJikanCover(null)).toBeNull();
    });
});
