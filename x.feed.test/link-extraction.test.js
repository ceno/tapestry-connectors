// Test for link extraction with media attachments
const { xload, extractExternalLinkFromContent } = require('../x.feed/resources/x-shared.js');

describe('Link Extraction', () => {
    test('should extract external links even when media attachments exist', () => {
        // Simulate an RSS feed item with both an image and an external link
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://rss.xcancel.com/SpaceX',
                    image: {
                        url: 'https://pbs.twimg.com/profile_images/123456789/avatar.jpg'
                    },
                    item: {
                        link: 'https://rss.xcancel.com/SpaceX/status/2018440335140024383#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'RT by @Heaney555: SpaceX has acquired xAI...',
                        description: '<p>SpaceX has acquired xAI, forming one of the most ambitious, vertically integrated innovation engines on (and off) Earth → <a href="http://spacex.com/updates#xai-joins-spacex">spacex.com/updates#xai-joins…</a></p><img src="https://pbs.twimg.com/media/HALwXVHXkAApqIx.jpg" style="max-width:250px;" />',
                        'dc:creator': '@SpaceX'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have attachments
        expect(item.attachments).toBeDefined();
        expect(item.attachments.length).toBeGreaterThan(0);
        
        // Should have both media and link attachments
        const mediaAttachments = item.attachments.filter(a => a.mimeType === 'image');
        const linkAttachments = item.attachments.filter(a => a.url && !a.mimeType);
        
        expect(mediaAttachments.length).toBeGreaterThan(0);
        expect(linkAttachments.length).toBeGreaterThan(0);
        
        // Verify the link attachment is the external link
        const linkAttachment = linkAttachments[0];
        expect(linkAttachment.url).toBe('http://spacex.com/updates#xai-joins-spacex');
    });

    test('should extract external link from second example (Reddit link)', () => {
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://rss.xcancel.com/pierceboggan',
                    item: {
                        link: 'https://rss.xcancel.com/pierceboggan/status/2017287612193767639#m',
                        pubDate: 'Thu, 30 Jan 2026 17:23:40 GMT',
                        title: 'Join our fantastic community',
                        description: '<p>Join our fantastic community on <a href="https://teddit.net/r/GithubCopilot/">teddit.net/r/GithubCopilot/</a> :)</p>',
                        'dc:creator': '@pierceboggan'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have attachments
        expect(item.attachments).toBeDefined();
        expect(item.attachments.length).toBeGreaterThan(0);
        
        // Should have a link attachment
        const linkAttachments = item.attachments.filter(a => a.url && !a.mimeType);
        expect(linkAttachments.length).toBeGreaterThan(0);
        
        // Verify the link attachment is the Reddit link
        const linkAttachment = linkAttachments[0];
        expect(linkAttachment.url).toBe('https://teddit.net/r/GithubCopilot/');
    });

    test('extractExternalLinkFromContent should find external links in HTML', () => {
        const content = '<p>SpaceX has acquired xAI → <a href="http://spacex.com/updates#xai-joins-spacex">spacex.com/updates#xai-joins…</a></p>';
        const feedUrl = 'https://rss.xcancel.com/SpaceX';
        
        const link = extractExternalLinkFromContent(content, feedUrl);
        
        expect(link).toBe('http://spacex.com/updates#xai-joins-spacex');
    });

    test('extractExternalLinkFromContent should ignore xcancel links', () => {
        const content = '<p>Check this out: <a href="https://xcancel.com/some/status">link</a></p>';
        const feedUrl = 'https://rss.xcancel.com/SpaceX';
        
        const link = extractExternalLinkFromContent(content, feedUrl);
        
        expect(link).toBeNull();
    });

    test('extractExternalLinkFromContent should ignore same-domain links', () => {
        const content = '<p>Check this out: <a href="https://rss.xcancel.com/SpaceX/status/123">link</a></p>';
        const feedUrl = 'https://rss.xcancel.com/SpaceX';
        
        const link = extractExternalLinkFromContent(content, feedUrl);
        
        expect(link).toBeNull();
    });
});
