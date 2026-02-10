// Load Tapestry mocks before requiring the module
require('./mocks/tapestry');

const { extractExternalLinkFromContent } = require('../x.feed/resources/x-shared');

describe('extractExternalLinkFromContent', () => {
    const feedUrl = 'https://xcancel.com/pierceboggan/rss';

    describe('with external links', () => {
        test('should extract Reddit links', () => {
            const content = '<p>Check this out: <a href="https://old.reddit.com/r/GithubCopilot/">old.reddit.com/r/GithubCopilot/</a></p>';
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://old.reddit.com/r/GithubCopilot/');
        });

        test('should extract GitHub links', () => {
            const content = '<p>Have you checked <a href="https://github.com/microsoft/DebugMCP">github.com/microsoft/DebugMC…</a>?</p>';
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://github.com/microsoft/DebugMCP');
        });

        test('should return the first external link when multiple exist', () => {
            const content = `
                <p>Link 1: <a href="https://example.com/first">First</a></p>
                <p>Link 2: <a href="https://example.org/second">Second</a></p>
            `;
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://example.com/first');
        });
    });

    describe('filtering internal links', () => {
        test('should skip xcancel.com links (internal to feed)', () => {
            const content = `
                <p><a href="https://xcancel.com/code" title="Visual Studio Code">@code</a></p>
                <p><a href="https://github.com/test">External</a></p>
            `;
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://github.com/test');
        });

        test('should return null if only xcancel links exist', () => {
            const content = `
                <p><a href="https://xcancel.com/user1">@user1</a></p>
                <p><a href="https://xcancel.com/user2">@user2</a></p>
            `;
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBeNull();
        });

        test('should skip links on the same domain as feedUrl', () => {
            const content = `
                <p><a href="https://xcancel.com/pierceboggan/status/123">My tweet</a></p>
                <p><a href="https://external.com/page">External</a></p>
            `;
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://external.com/page');
        });
    });

    describe('edge cases', () => {
        test('should return null for null content', () => {
            expect(extractExternalLinkFromContent(null, feedUrl)).toBeNull();
        });

        test('should return null for empty content', () => {
            expect(extractExternalLinkFromContent('', feedUrl)).toBeNull();
        });

        test('should return null for null feedUrl', () => {
            const content = '<a href="https://example.com">Link</a>';
            expect(extractExternalLinkFromContent(content, null)).toBeNull();
        });

        test('should return null for content with no links', () => {
            const content = '<p>Just some text without any links</p>';
            expect(extractExternalLinkFromContent(content, feedUrl)).toBeNull();
        });

        test('should skip relative links', () => {
            const content = '<a href="/relative/path">Relative</a><a href="https://example.com">External</a>';
            const result = extractExternalLinkFromContent(content, feedUrl);
            expect(result).toBe('https://example.com');
        });
    });
});
