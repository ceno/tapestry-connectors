// Test for retweet avatar handling
const { xload, extractProfileAvatarFromHtml } = require('../x.feed/resources/x-shared.js');

describe('Retweet Avatar Handling', () => {
    test('should extract profile avatar from HTML in retweets', () => {
        // Simulate a retweet in Heaney555's feed of a post by SpaceX
        // The HTML description includes the SpaceX profile avatar
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/Heaney555',
                    image: {
                        url: 'https://pbs.twimg.com/profile_images/heaney555/avatar.jpg'
                    },
                    item: {
                        link: 'https://xcancel.com/SpaceX/status/2018440335140024383#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'RT by @Heaney555: SpaceX has acquired xAI...',
                        description: '<img style="border-radius:50%;margin-right:8px" width="48" height="48" src="https://pbs.twimg.com/profile_images/1882982818389254144/SpaceX_avatar.jpg"/><p>SpaceX has acquired xAI</p>',
                        'dc:creator': '@SpaceX'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have an author
        expect(item.author).toBeDefined();
        expect(item.author.name).toBe('SpaceX');
        
        // For retweets, should extract avatar from HTML
        expect(item.author.avatar).toBe('https://pbs.twimg.com/profile_images/1882982818389254144/SpaceX_avatar.jpg');
        
        // Should have a retweet annotation
        expect(item.annotations).toBeDefined();
        expect(item.annotations.length).toBe(1);
        expect(item.annotations[0].text).toBe('@Heaney555 Reposted');
    });

    test('should extract profile avatar with profile_images URL pattern', () => {
        // Test with a different HTML format that includes profile_images in the URL
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/user1',
                    item: {
                        link: 'https://xcancel.com/user2/status/123#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'RT by @user1: Another post',
                        description: '<img width="40" height="40" src="https://pbs.twimg.com/profile_images/987654321/avatar_normal.jpg"><p>Another post content</p>',
                        'dc:creator': '@user2'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        expect(item.author.avatar).toBe('https://pbs.twimg.com/profile_images/987654321/avatar_normal.jpg');
    });

    test('should handle regular posts (non-retweets) with channel image as avatar', () => {
        // Regular post from the feed owner - should get the channel image as avatar
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/pierceboggan',
                    image: {
                        url: 'https://pbs.twimg.com/profile_images/pierceboggan/avatar.jpg'
                    },
                    item: {
                        link: 'https://xcancel.com/pierceboggan/status/123456#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'My own post',
                        description: '<p>This is my own post</p>',
                        'dc:creator': '@pierceboggan'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Should have an author
        expect(item.author).toBeDefined();
        expect(item.author.name).toBe('pierceboggan');
        
        // For regular posts from the feed owner, should use channel image
        expect(item.author.avatar).toBe('https://pbs.twimg.com/profile_images/pierceboggan/avatar.jpg');
        
        // Should not have retweet annotation
        expect(item.annotations).toBeNull();
    });

    test('should handle retweets when includeRetweets is off', () => {
        // When retweets are disabled, they should be filtered out
        global.includeRetweets = "off";
        
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/Heaney555',
                    item: {
                        link: 'https://xcancel.com/SpaceX/status/2018440335140024383#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'RT by @Heaney555: SpaceX has acquired xAI...',
                        description: '<p>SpaceX has acquired xAI</p>',
                        'dc:creator': '@SpaceX'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        // Should be filtered out
        expect(results).toHaveLength(0);
        
        // Reset to default
        global.includeRetweets = "on";
    });

    test('should handle retweets without avatar in HTML', () => {
        // Some retweets might not have avatar in the HTML
        const mockRssFeed = {
            rss: {
                channel: {
                    link: 'https://xcancel.com/user1',
                    item: {
                        link: 'https://xcancel.com/user2/status/999#m',
                        pubDate: 'Sun, 02 Feb 2026 21:44:11 GMT',
                        title: 'RT by @user1: Post without avatar',
                        description: '<p>Just text, no avatar image</p>',
                        'dc:creator': '@user2'
                    }
                }
            }
        };

        const results = xload(mockRssFeed);
        
        expect(results).toHaveLength(1);
        const item = results[0];
        
        // Avatar should be null if not found in HTML
        expect(item.author.avatar).toBeNull();
    });
});

describe('extractProfileAvatarFromHtml', () => {
    test('should extract avatar with border-radius:50%', () => {
        const content = '<img style="border-radius:50%;margin-right:8px" width="48" height="48" src="https://pbs.twimg.com/profile_images/123/avatar.jpg"/><p>Content</p>';
        const avatar = extractProfileAvatarFromHtml(content);
        expect(avatar).toBe('https://pbs.twimg.com/profile_images/123/avatar.jpg');
    });

    test('should extract avatar with profile_images in URL', () => {
        const content = '<img width="40" src="https://pbs.twimg.com/profile_images/456/pic.jpg"><p>Content</p>';
        const avatar = extractProfileAvatarFromHtml(content);
        expect(avatar).toBe('https://pbs.twimg.com/profile_images/456/pic.jpg');
    });

    test('should return null for content without profile avatar', () => {
        const content = '<p>Just text</p><img src="https://example.com/media/image.jpg">';
        const avatar = extractProfileAvatarFromHtml(content);
        expect(avatar).toBeNull();
    });

    test('should handle &amp; in URLs', () => {
        const content = '<img style="border-radius:50%" src="https://pbs.twimg.com/profile_images/123/avatar.jpg?format=jpg&amp;name=48x48"/>';
        const avatar = extractProfileAvatarFromHtml(content);
        expect(avatar).toBe('https://pbs.twimg.com/profile_images/123/avatar.jpg?format=jpg&name=48x48');
    });
});
