// content-filter.test.js - Test Instagram feed content filtering

const instagramShared = require('../instagram.feed/resources/instagram-shared.js');

describe('Instagram Content Filter', () => {
    
    describe('shouldIncludePost', () => {
        const imagePost = {
            id: '1',
            typename: 'GraphImage',
            isVideo: false,
            shortcode: 'abc123'
        };

        const videoPost = {
            id: '2',
            typename: 'GraphVideo',
            isVideo: true,
            shortcode: 'def456'
        };

        const carouselPost = {
            id: '3',
            typename: 'GraphSidecar',
            isVideo: false,
            shortcode: 'ghi789'
        };

        // Edge case: video in non-carousel that has GraphImage typename but isVideo=true
        const videoPostAlt = {
            id: '4',
            typename: 'GraphImage',
            isVideo: true,
            shortcode: 'jkl012'
        };

        test('filter "all" includes all post types', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'all')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPost, 'all')).toBe(true);
            expect(instagramShared.shouldIncludePost(carouselPost, 'all')).toBe(true);
        });

        test('filter undefined includes all post types', () => {
            expect(instagramShared.shouldIncludePost(imagePost, undefined)).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPost, undefined)).toBe(true);
            expect(instagramShared.shouldIncludePost(carouselPost, undefined)).toBe(true);
        });

        test('filter "images" includes only images', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'images')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPost, 'images')).toBe(false);
            expect(instagramShared.shouldIncludePost(carouselPost, 'images')).toBe(false);
            expect(instagramShared.shouldIncludePost(videoPostAlt, 'images')).toBe(false);
        });

        test('filter "videos" includes only videos', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'videos')).toBe(false);
            expect(instagramShared.shouldIncludePost(videoPost, 'videos')).toBe(true);
            expect(instagramShared.shouldIncludePost(carouselPost, 'videos')).toBe(false);
            expect(instagramShared.shouldIncludePost(videoPostAlt, 'videos')).toBe(true);
        });

        test('filter "carousels" includes only carousels', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'carousels')).toBe(false);
            expect(instagramShared.shouldIncludePost(videoPost, 'carousels')).toBe(false);
            expect(instagramShared.shouldIncludePost(carouselPost, 'carousels')).toBe(true);
        });

        test('filter "images_carousels" includes images and carousels', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'images_carousels')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPost, 'images_carousels')).toBe(false);
            expect(instagramShared.shouldIncludePost(carouselPost, 'images_carousels')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPostAlt, 'images_carousels')).toBe(false);
        });

        test('filter "videos_carousels" includes videos and carousels', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'videos_carousels')).toBe(false);
            expect(instagramShared.shouldIncludePost(videoPost, 'videos_carousels')).toBe(true);
            expect(instagramShared.shouldIncludePost(carouselPost, 'videos_carousels')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPostAlt, 'videos_carousels')).toBe(true);
        });

        test('unknown filter value defaults to including all', () => {
            expect(instagramShared.shouldIncludePost(imagePost, 'unknown_filter')).toBe(true);
            expect(instagramShared.shouldIncludePost(videoPost, 'unknown_filter')).toBe(true);
            expect(instagramShared.shouldIncludePost(carouselPost, 'unknown_filter')).toBe(true);
        });
    });

    describe('Integration with parseWebProfileInfo', () => {
        test('filtering works with parsed posts', () => {
            // Mock web profile info response
            const mockJson = {
                data: {
                    user: {
                        id: '123',
                        username: 'testuser',
                        full_name: 'Test User',
                        profile_pic_url: 'https://example.com/pic.jpg',
                        edge_owner_to_timeline_media: {
                            edges: [
                                {
                                    node: {
                                        id: '1',
                                        shortcode: 'abc',
                                        __typename: 'GraphImage',
                                        taken_at_timestamp: 1234567890,
                                        is_video: false,
                                        display_url: 'https://example.com/img1.jpg',
                                        edge_media_to_caption: { edges: [{ node: { text: 'Image post' } }] },
                                        owner: { username: 'testuser' }
                                    }
                                },
                                {
                                    node: {
                                        id: '2',
                                        shortcode: 'def',
                                        __typename: 'GraphVideo',
                                        taken_at_timestamp: 1234567891,
                                        is_video: true,
                                        video_url: 'https://example.com/vid.mp4',
                                        display_url: 'https://example.com/vid-thumb.jpg',
                                        edge_media_to_caption: { edges: [{ node: { text: 'Video post' } }] },
                                        owner: { username: 'testuser' }
                                    }
                                },
                                {
                                    node: {
                                        id: '3',
                                        shortcode: 'ghi',
                                        __typename: 'GraphSidecar',
                                        taken_at_timestamp: 1234567892,
                                        is_video: false,
                                        display_url: 'https://example.com/carousel.jpg',
                                        edge_media_to_caption: { edges: [{ node: { text: 'Carousel post' } }] },
                                        edge_sidecar_to_children: { edges: [] },
                                        owner: { username: 'testuser' }
                                    }
                                }
                            ]
                        }
                    }
                }
            };

            const result = instagramShared.parseWebProfileInfo(mockJson, 'testuser');
            
            // Test that all posts are parsed
            expect(result.posts).toHaveLength(3);
            
            // Test filtering
            const imageOnly = result.posts.filter(p => instagramShared.shouldIncludePost(p, 'images'));
            expect(imageOnly).toHaveLength(1);
            expect(imageOnly[0].typename).toBe('GraphImage');
            
            const videoOnly = result.posts.filter(p => instagramShared.shouldIncludePost(p, 'videos'));
            expect(videoOnly).toHaveLength(1);
            expect(videoOnly[0].typename).toBe('GraphVideo');
            
            const carouselOnly = result.posts.filter(p => instagramShared.shouldIncludePost(p, 'carousels'));
            expect(carouselOnly).toHaveLength(1);
            expect(carouselOnly[0].typename).toBe('GraphSidecar');
            
            const imagesAndCarousels = result.posts.filter(p => instagramShared.shouldIncludePost(p, 'images_carousels'));
            expect(imagesAndCarousels).toHaveLength(2);
        });
    });
});
