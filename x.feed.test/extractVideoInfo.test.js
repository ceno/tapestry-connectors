// Load Tapestry mocks before requiring the module
require('./mocks/tapestry');

const { extractVideoInfo } = require('../x.feed/resources/x-shared');

describe('extractVideoInfo', () => {
    describe('with video content', () => {
        const contentWithVideo = `<p>New in @code Insiders: Interactive mermaid diagrams in Chat.</p>
<a href="https://xcancel.com/pierceboggan/status/2017344699498172651#m">
<br>Video<br>
  <img src="https://pbs.twimg.com/amplify_video_thumb/2017344096675790848/img/VTrID7vZrJuUfz14.jpg" style="max-width:250px;" />
</a>`;
        const itemLink = 'https://xcancel.com/pierceboggan/status/2017344699498172651#m';

        test('should extract video thumbnail URL', () => {
            const result = extractVideoInfo(contentWithVideo, itemLink);
            expect(result).not.toBeNull();
            expect(result.thumbnailUrl).toBe('https://pbs.twimg.com/amplify_video_thumb/2017344096675790848/img/VTrID7vZrJuUfz14.jpg');
        });

        test('should extract status page URL without fragment', () => {
            const result = extractVideoInfo(contentWithVideo, itemLink);
            expect(result.statusPageUrl).toBe('https://xcancel.com/pierceboggan/status/2017344699498172651');
        });

        test('should handle &amp; encoded URLs', () => {
            const contentWithEncodedUrl = `<img src="https://pbs.twimg.com/amplify_video_thumb/123/img/test.jpg?format=jpg&amp;name=800x419" />`;
            const result = extractVideoInfo(contentWithEncodedUrl, 'https://xcancel.com/user/status/123#m');
            expect(result.thumbnailUrl).toBe('https://pbs.twimg.com/amplify_video_thumb/123/img/test.jpg?format=jpg&name=800x419');
        });
    });

    describe('without video content', () => {
        test('should return null for content without amplify_video_thumb', () => {
            const contentWithoutVideo = '<p>Just a regular tweet with an image</p><img src="https://pbs.twimg.com/media/image.jpg" />';
            const result = extractVideoInfo(contentWithoutVideo, 'https://xcancel.com/user/status/123#m');
            expect(result).toBeNull();
        });

        test('should return null for empty content', () => {
            const result = extractVideoInfo('', 'https://xcancel.com/user/status/123#m');
            expect(result).toBeNull();
        });

        test('should return null for null content', () => {
            const result = extractVideoInfo(null, 'https://xcancel.com/user/status/123#m');
            expect(result).toBeNull();
        });
    });

    describe('edge cases', () => {
        test('should return null when itemLink is null', () => {
            const content = '<img src="https://pbs.twimg.com/amplify_video_thumb/123/img/test.jpg" />';
            const result = extractVideoInfo(content, null);
            expect(result).toBeNull();
        });

        test('should return null when itemLink is empty', () => {
            const content = '<img src="https://pbs.twimg.com/amplify_video_thumb/123/img/test.jpg" />';
            const result = extractVideoInfo(content, '');
            expect(result).toBeNull();
        });

        test('should handle links without fragment', () => {
            const content = '<img src="https://pbs.twimg.com/amplify_video_thumb/123/img/test.jpg" />';
            const result = extractVideoInfo(content, 'https://xcancel.com/user/status/123');
            expect(result.statusPageUrl).toBe('https://xcancel.com/user/status/123');
        });
    });
});
