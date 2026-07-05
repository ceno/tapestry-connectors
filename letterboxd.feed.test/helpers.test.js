// helpers.test.js - Unit tests for letterboxd-shared helper functions

require('./mocks/tapestry');
const {
    cleanUsername,
    buildFeedUrl,
    parseChannelTitle,
    extractAvatarFromProfileHtml,
    entryTypeFromGuid,
    extractImages,
    posterAspectSize
} = require('../letterboxd.feed/resources/letterboxd-shared');

describe('cleanUsername', () => {
    test('accepts a plain username', () => {
        expect(cleanUsername('dave')).toBe('dave');
    });

    test('strips a leading @', () => {
        expect(cleanUsername('@dave')).toBe('dave');
    });

    test('extracts the username from a profile URL', () => {
        expect(cleanUsername('https://letterboxd.com/dave/')).toBe('dave');
        expect(cleanUsername('letterboxd.com/dave')).toBe('dave');
        expect(cleanUsername('https://letterboxd.com/dave/films/')).toBe('dave');
    });

    test('lowercases and trims', () => {
        expect(cleanUsername('  Dave ')).toBe('dave');
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
    test('builds the RSS URL', () => {
        expect(buildFeedUrl('dave')).toBe('https://letterboxd.com/dave/rss/');
    });
});

describe('parseChannelTitle', () => {
    test('strips the Letterboxd prefix', () => {
        expect(parseChannelTitle('Letterboxd - Dave Vis')).toBe('Dave Vis');
    });

    test('returns null for empty input', () => {
        expect(parseChannelTitle(null)).toBeNull();
        expect(parseChannelTitle('Letterboxd - ')).toBeNull();
    });
});

describe('extractAvatarFromProfileHtml', () => {
    test('finds og:image with property first', () => {
        const html = '<meta property="og:image" content="https://a.ltrbxd.com/avatar.jpg" />';
        expect(extractAvatarFromProfileHtml(html)).toBe('https://a.ltrbxd.com/avatar.jpg');
    });

    test('finds og:image with content first', () => {
        const html = '<meta content="https://a.ltrbxd.com/avatar.jpg" property="og:image" />';
        expect(extractAvatarFromProfileHtml(html)).toBe('https://a.ltrbxd.com/avatar.jpg');
    });

    test('returns null when missing', () => {
        expect(extractAvatarFromProfileHtml('<html></html>')).toBeNull();
        expect(extractAvatarFromProfileHtml(null)).toBeNull();
    });
});

describe('entryTypeFromGuid', () => {
    test('identifies watches, reviews and lists', () => {
        expect(entryTypeFromGuid('letterboxd-watch-1369875590')).toBe('letterboxd-watch');
        expect(entryTypeFromGuid('letterboxd-review-1369940796')).toBe('letterboxd-review');
        expect(entryTypeFromGuid('letterboxd-list-123')).toBe('letterboxd-list');
    });

    test('returns empty string for unknown guids', () => {
        expect(entryTypeFromGuid('something-else')).toBe('');
        expect(entryTypeFromGuid(null)).toBe('');
    });
});

describe('extractImages', () => {
    test('extracts poster and removes poster-only paragraph', () => {
        const html = '<p><img src="https://a.ltrbxd.com/poster.jpg"/></p> <p>Watched on Thursday.</p>';
        const { images, body } = extractImages(html);
        expect(images).toEqual(['https://a.ltrbxd.com/poster.jpg']);
        expect(body).toBe('<p>Watched on Thursday.</p>');
    });

    test('extracts multiple images (list entries)', () => {
        const html = '<p><img src="https://a.com/1.jpg"/><img src="https://a.com/2.jpg"/></p><p>My list</p>';
        const { images, body } = extractImages(html);
        expect(images).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
        expect(body).toBe('<p>My list</p>');
    });

    test('handles empty input', () => {
        expect(extractImages(null)).toEqual({ images: [], body: '' });
    });
});

describe('posterAspectSize', () => {
    test('parses the crop size from poster URLs', () => {
        const url = 'https://a.ltrbxd.com/resized/film-poster/2/2/8/228628-toy-story-4-0-600-0-900-crop.jpg?v=abc';
        expect(posterAspectSize(url)).toEqual({ width: 600, height: 900 });
    });

    test('returns null for other URLs', () => {
        expect(posterAspectSize('https://example.com/image.jpg')).toBeNull();
    });
});
