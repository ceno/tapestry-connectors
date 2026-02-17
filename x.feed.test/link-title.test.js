// Test for extracting link titles from X posts

const { xload } = require('../x.feed/resources/x-shared.js');

describe('X posts with link cards', () => {
    test('should extract link attachment with title from card image', async () => {
        // This test simulates the RSS feed structure from the problem statement
        // The card_img indicates a link preview, and we need to extract the title
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/AnthropicAI',
                    title: 'AnthropicAI',
                    image: {
                        url: 'https://unavatar.io/twitter/AnthropicAI'
                    },
                    item: {
                        link: 'https://xcancel.com/AnthropicAI/status/2021694494215901314#m',
                        'dc:creator': '@AnthropicAI',
                        pubDate: 'Tue, 11 Feb 2026 21:15:03 +0000',
                        title: 'We\'re committing to cover electricity price increases',
                        description: `<p>We're committing to cover electricity price increases from our data centers.<br>
<br>
To ensure ratepayers aren't picking up the tab, we'll pay 100% of grid upgrade costs, work to bring new power online, and invest in systems to reduce grid strain.<br>
<br>
Read more: <a href="https://www.anthropic.com/news/covering-electricity-price-increases">anthropic.com/news/covering-…</a></p>
<img src="https://pbs.twimg.com/card_img/2021834998400102400/73adA9Tq?format=jpg&name=800x419" style="max-width:250px;" />`
                    }
                }
            }
        };

        const results = await xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have a link attachment
        expect(item.attachments).toBeDefined();
        expect(item.attachments.length).toBeGreaterThan(0);
        
        // Find the link attachment
        const linkAttachment = item.attachments.find(a => a.url === 'https://www.anthropic.com/news/covering-electricity-price-increases');
        expect(linkAttachment).toBeDefined();
        
        // Should have an image from the card
        expect(linkAttachment.image).toBeDefined();
        expect(linkAttachment.image).toContain('card_img');
        
        // This is what we're trying to fix - the title should be extracted
        // For now, we'll just check that the attachment exists
        // After the fix, we should be able to extract a title
        console.log('Link attachment:', linkAttachment);
    });

    test('should handle posts with regular media (not link cards)', async () => {
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/testuser',
                    title: 'testuser',
                    item: {
                        link: 'https://xcancel.com/testuser/status/123',
                        'dc:creator': '@testuser',
                        pubDate: 'Tue, 11 Feb 2026 21:15:03 +0000',
                        title: 'A post with an image',
                        description: `<p>Check out this image!</p>
<img src="https://pbs.twimg.com/media/123/image.jpg" />`
                    }
                }
            }
        };

        const results = await xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have a media attachment, not a link attachment
        expect(item.attachments).toBeDefined();
        expect(item.attachments.length).toBeGreaterThan(0);
        
        // The attachment should be a regular image (from media, not card_img)
        const mediaAttachment = item.attachments[0];
        expect(mediaAttachment.url).toContain('pbs.twimg.com/media');
    });
});
