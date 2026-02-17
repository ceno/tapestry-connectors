// Test for extracting link titles from X posts

const { xload, fetchLinkMetadata } = require('../x.feed/resources/x-shared.js');

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
        
        // Note: In test environment, title won't be fetched because sendRequest isn't available
        // In Tapestry runtime, the title would be fetched from the link's Open Graph metadata
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

describe('fetchLinkMetadata', () => {
    test('should return null when sendRequest is not available (Node.js environment)', async () => {
        const metadata = await fetchLinkMetadata('https://example.com');
        expect(metadata).toBeNull();
    });
    
    test('should handle errors gracefully', async () => {
        // Mock sendRequest to simulate Tapestry environment but with an error
        global.sendRequest = jest.fn().mockRejectedValue(new Error('Network error'));
        global.extractProperties = jest.fn();
        
        const metadata = await fetchLinkMetadata('https://example.com');
        
        // Should return null on error, not throw
        expect(metadata).toBeNull();
        
        // Clean up
        delete global.sendRequest;
        delete global.extractProperties;
    });
    
    test('should extract metadata when sendRequest and extractProperties are available', async () => {
        // Mock Tapestry runtime functions
        global.sendRequest = jest.fn().mockResolvedValue('<html>...</html>');
        global.extractProperties = jest.fn().mockResolvedValue({
            'og:title': 'Test Article Title',
            'og:description': 'Test description',
            'og:image': 'https://example.com/image.jpg',
            'og:site_name': 'Example Site'
        });
        
        const metadata = await fetchLinkMetadata('https://example.com/article');
        
        expect(metadata).not.toBeNull();
        expect(metadata.title).toBe('Test Article Title');
        expect(metadata.subtitle).toBe('Test description');
        expect(metadata.image).toBe('https://example.com/image.jpg');
        expect(metadata.siteName).toBe('Example Site');
        
        expect(sendRequest).toHaveBeenCalledWith('https://example.com/article', 'GET');
        expect(extractProperties).toHaveBeenCalledWith('<html>...</html>');
        
        // Clean up
        delete global.sendRequest;
        delete global.extractProperties;
    });
    
    test('should fallback to non-og properties when og properties are not available', async () => {
        // Mock Tapestry runtime functions with non-og properties
        global.sendRequest = jest.fn().mockResolvedValue('<html>...</html>');
        global.extractProperties = jest.fn().mockResolvedValue({
            'title': 'Fallback Title',
            'description': 'Fallback description'
        });
        
        const metadata = await fetchLinkMetadata('https://example.com/article');
        
        expect(metadata).not.toBeNull();
        expect(metadata.title).toBe('Fallback Title');
        expect(metadata.subtitle).toBe('Fallback description');
        
        // Clean up
        delete global.sendRequest;
        delete global.extractProperties;
    });
});
