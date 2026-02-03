// Test for fixing duplicate posts from xcancel.com vs rss.xcancel.com

const { normalizeXCancelUrl, xload } = require('../x.feed/resources/x-shared.js');

describe('normalizeXCancelUrl', () => {
    test('should normalize rss.xcancel.com to xcancel.com', () => {
        const input = 'https://rss.xcancel.com/pierceboggan/status/2018446222550606210#m';
        const expected = 'https://xcancel.com/pierceboggan/status/2018446222550606210#m';
        expect(normalizeXCancelUrl(input)).toBe(expected);
    });

    test('should leave xcancel.com URLs unchanged', () => {
        const input = 'https://xcancel.com/pierceboggan/status/2018446222550606210#m';
        expect(normalizeXCancelUrl(input)).toBe(input);
    });

    test('should handle URLs without rss subdomain', () => {
        const input = 'https://twitter.com/user/status/123';
        expect(normalizeXCancelUrl(input)).toBe(input);
    });

    test('should handle null or undefined', () => {
        expect(normalizeXCancelUrl(null)).toBeNull();
        expect(normalizeXCancelUrl(undefined)).toBeUndefined();
    });

    test('should not replace rss.xcancel.com if it appears in URL path or query', () => {
        // Ensure we only replace the hostname, not arbitrary text in the URL
        const input = 'https://example.com/redirect?url=https://rss.xcancel.com/user/status/123';
        expect(normalizeXCancelUrl(input)).toBe(input);
    });

    test('should work with both http and https', () => {
        const httpsInput = 'https://rss.xcancel.com/user/status/123';
        const httpInput = 'http://rss.xcancel.com/user/status/123';
        expect(normalizeXCancelUrl(httpsInput)).toBe('https://xcancel.com/user/status/123');
        expect(normalizeXCancelUrl(httpInput)).toBe('http://xcancel.com/user/status/123');
    });
});

describe('xload with RSS 2.0 feed containing duplicates', () => {
    test('should normalize URLs in RSS items', () => {
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/pierceboggan',
                    title: 'pierceboggan',
                    image: {
                        url: 'https://pbs.twimg.com/profile_images/1887288324303507456/J2bo0YB9_400x400.jpg'
                    },
                    item: [
                        {
                            link: 'https://rss.xcancel.com/pierceboggan/status/2018446222550606210#m',
                            'dc:creator': '@pierceboggan',
                            pubDate: 'Sun, 02 Feb 2026 22:07:35 +0000',
                            title: 'The definition of insanity',
                            description: '<p>The definition of insanity is doing the same thing over and over again and expecting different results</p>'
                        },
                        {
                            link: 'https://xcancel.com/pierceboggan/status/1234567890',
                            'dc:creator': '@pierceboggan',
                            pubDate: 'Mon, 03 Feb 2026 10:00:00 +0000',
                            title: 'Another post',
                            description: '<p>Another test post</p>'
                        }
                    ]
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(2);
        // Both items should use normalized xcancel.com URLs
        expect(results[0].uri).toBe('https://xcancel.com/pierceboggan/status/2018446222550606210#m');
        expect(results[1].uri).toBe('https://xcancel.com/pierceboggan/status/1234567890');
        
        // Author URIs should also be normalized
        expect(results[0].author.uri).toBe('https://xcancel.com/pierceboggan');
        expect(results[1].author.uri).toBe('https://xcancel.com/pierceboggan');
    });

    test('should normalize URLs in single RSS item', () => {
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/testuser',
                    title: 'testuser',
                    item: {
                        link: 'https://rss.xcancel.com/testuser/status/999#m',
                        'dc:creator': '@testuser',
                        pubDate: 'Sun, 02 Feb 2026 22:07:35 +0000',
                        title: 'Test',
                        description: '<p>Test post</p>'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        expect(results[0].uri).toBe('https://xcancel.com/testuser/status/999#m');
    });
});
