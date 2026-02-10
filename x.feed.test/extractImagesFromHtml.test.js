// Load Tapestry mocks before requiring the module
require('./mocks/tapestry');

const { extractImagesFromHtml } = require('../x.feed/resources/x-shared');

describe('extractImagesFromHtml', () => {
    describe('with images in content', () => {
        test('should extract single image URL from description', () => {
            const content = `<p>Coming soon to a <a href="https://xcancel.com/code" title="Visual Studio Code">@code</a> near you 👀</p>
<img src="https://pbs.twimg.com/media/G_3jZRJXEAAgZ9o.png" style="max-width:250px;" />`;
            
            const result = extractImagesFromHtml(content);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe('https://pbs.twimg.com/media/G_3jZRJXEAAgZ9o.png');
        });

        test('should extract multiple images', () => {
            const content = `<p>Multiple images</p>
<img src="https://pbs.twimg.com/media/image1.jpg" />
<img src="https://pbs.twimg.com/media/image2.png" />
<img src="https://pbs.twimg.com/media/image3.gif" />`;
            
            const result = extractImagesFromHtml(content);
            expect(result).toHaveLength(3);
            expect(result[0]).toBe('https://pbs.twimg.com/media/image1.jpg');
            expect(result[1]).toBe('https://pbs.twimg.com/media/image2.png');
            expect(result[2]).toBe('https://pbs.twimg.com/media/image3.gif');
        });

        test('should handle &amp; encoded URLs', () => {
            const content = `<img src="https://pbs.twimg.com/media/image.jpg?format=jpg&amp;name=800x419" />`;
            
            const result = extractImagesFromHtml(content);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe('https://pbs.twimg.com/media/image.jpg?format=jpg&name=800x419');
        });

        test('should handle img tags with various attribute orders', () => {
            const content = `<img style="max-width:250px;" src="https://pbs.twimg.com/media/test.jpg" alt="test" />`;
            
            const result = extractImagesFromHtml(content);
            expect(result).toHaveLength(1);
            expect(result[0]).toBe('https://pbs.twimg.com/media/test.jpg');
        });

        test('should handle both single and double quotes', () => {
            const content = `<img src="https://example.com/double.jpg" /><img src='https://example.com/single.jpg' />`;
            
            const result = extractImagesFromHtml(content);
            expect(result).toHaveLength(2);
            expect(result[0]).toBe('https://example.com/double.jpg');
            expect(result[1]).toBe('https://example.com/single.jpg');
        });
    });

    describe('without images', () => {
        test('should return empty array for content without images', () => {
            const content = '<p>Just text with a <a href="https://example.com">link</a></p>';
            
            const result = extractImagesFromHtml(content);
            expect(result).toEqual([]);
        });

        test('should return empty array for empty string', () => {
            const result = extractImagesFromHtml('');
            expect(result).toEqual([]);
        });

        test('should return empty array for null', () => {
            const result = extractImagesFromHtml(null);
            expect(result).toEqual([]);
        });

        test('should return empty array for undefined', () => {
            const result = extractImagesFromHtml(undefined);
            expect(result).toEqual([]);
        });
    });
});
