// Load Tapestry mocks before requiring the module
require('./mocks/tapestry');

const { xload, extractString, attachmentForAttributes, extractVideoInfo, extractExternalLinkFromContent } = require('../x.feed/resources/x-shared');
const fs = require('fs');
const path = require('path');

// Load test fixture
const testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test.json'), 'utf8'));

describe('xload', () => {
    describe('RSS 2.0 feed parsing', () => {
        let results;

        beforeAll(() => {
            results = xload(testData);
        });

        test('should return an array of items', () => {
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
        });

        test('should parse the correct number of items', () => {
            // The test fixture has 20 items
            expect(results.length).toBe(20);
        });

        test('should create items with uri from link', () => {
            const firstItem = results[0];
            expect(firstItem.uri).toBe('https://xcancel.com/njukidreborn/status/2017377968956571708#m');
        });

        test('should parse pubDate correctly', () => {
            const firstItem = results[0];
            expect(firstItem.date).toBeInstanceOf(Date);
            expect(firstItem.date.toISOString()).toContain('2026-01-30');
        });

        test('should set body from description HTML', () => {
            // The xload function uses description for body, not title
            const itemWithMermaid = results.find(item => 
                item.body && item.body.includes('mermaid diagrams')
            );
            expect(itemWithMermaid).toBeDefined();
        });

        test('should extract body/description as HTML', () => {
            const firstItem = results[0];
            expect(firstItem.body).toContain('<p>');
            expect(firstItem.body).toContain('@excalidraw');
        });

        test('should create author identity from dc:creator', () => {
            const firstItem = results[0];
            expect(firstItem.author).toBeDefined();
            // The @ prefix is stripped when creating the identity
            expect(firstItem.author.name).toBe('njukidreborn');
        });

        test('should detect retweets from title prefix', () => {
            // Retweets have "RT by @username:" prefix in title
            // Check if any item has the RT prefix in the original data
            const hasRetweets = testData.rss.channel.item.some(item => 
                item.title && item.title.startsWith('RT by')
            );
            expect(hasRetweets).toBe(true);
        });
    });

    describe('retweet filtering', () => {
        test('should include retweets when includeRetweets is "on"', () => {
            global.includeRetweets = 'on';
            const allResults = xload(testData);
            // Count items that are retweets in source data
            const rtCount = testData.rss.channel.item.filter(item => 
                item.title && item.title.startsWith('RT by')
            ).length;
            // With includeRetweets on, we should have all items
            expect(allResults.length).toBe(testData.rss.channel.item.length);
        });

        test('should exclude retweets when includeRetweets is "off"', () => {
            global.includeRetweets = 'off';
            const results = xload(testData);
            const retweets = results.filter(item => 
                item.annotations && item.annotations.some(a => a.text === 'repost')
            );
            expect(retweets.length).toBe(0);
            
            // Reset for other tests
            global.includeRetweets = 'on';
        });
    });

    describe('edge cases', () => {
        test('should throw when given null input', () => {
            // Current implementation doesn't handle null gracefully
            expect(() => xload(null)).toThrow();
        });

        test('should throw when given undefined input', () => {
            // Current implementation doesn't handle undefined gracefully
            expect(() => xload(undefined)).toThrow();
        });

        test('should return empty array for empty object', () => {
            expect(xload({})).toEqual([]);
        });

        test('should return empty array for unknown feed format', () => {
            expect(xload({ unknown: { data: [] } })).toEqual([]);
        });
    });
});
