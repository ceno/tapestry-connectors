// Load Tapestry mocks before requiring the module
require('./mocks/tapestry');

const { extractString } = require('../x.feed/resources/x-shared');

describe('extractString', () => {
    describe('with string input', () => {
        test('should return trimmed string', () => {
            expect(extractString('  hello world  ')).toBe('hello world');
        });

        test('should handle empty string', () => {
            expect(extractString('')).toBe('');
        });
    });

    describe('with null/undefined input', () => {
        test('should return null for null', () => {
            expect(extractString(null)).toBeNull();
        });

        test('should return null for undefined', () => {
            // extractString returns null for falsy values
            expect(extractString(undefined)).toBeNull();
        });
    });

    describe('with object containing p elements', () => {
        test('should extract text from single p element', () => {
            const node = { p: 'Paragraph text' };
            expect(extractString(node)).toBe('Paragraph text');
        });

        test('should concatenate text from array of p elements', () => {
            const node = { p: ['First paragraph', 'Second paragraph'] };
            expect(extractString(node)).toBe('First paragraphSecond paragraph');
        });

        test('should wrap in <p> tags when allowHTML is true', () => {
            const node = { p: 'Paragraph text' };
            expect(extractString(node, true)).toBe('<p>Paragraph text</p>\n');
        });

        test('should wrap array p elements in <p> tags when allowHTML is true', () => {
            const node = { p: ['First', 'Second'] };
            const result = extractString(node, true);
            expect(result).toBe('<p>First</p>\n<p>Second</p>\n');
        });
    });

    describe('with object containing a (anchor) elements', () => {
        test('should extract text from single a element', () => {
            const node = { a: 'Link text' };
            expect(extractString(node)).toBe('Link text');
        });

        test('should concatenate text from array of a elements', () => {
            const node = { a: ['Link 1', 'Link 2'] };
            expect(extractString(node)).toBe('Link 1Link 2');
        });

        test('should create anchor tag with href when allowHTML is true', () => {
            const node = { 
                a: 'Click here', 
                'a$attrs': { href: 'https://example.com' } 
            };
            expect(extractString(node, true)).toBe('<a href="https://example.com">Click here</a>');
        });

        test('should return plain text if no href when allowHTML is true', () => {
            const node = { a: 'Click here' };
            expect(extractString(node, true)).toBe('Click here');
        });
    });

    describe('nested structures', () => {
        test('should handle nested p containing string', () => {
            const node = { p: { p: 'Nested text' } };
            expect(extractString(node)).toBe('Nested text');
        });
    });
});
