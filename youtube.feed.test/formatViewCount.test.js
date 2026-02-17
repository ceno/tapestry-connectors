// formatViewCount.test.js - Tests for view count formatting

require('../youtube.feed.test/mocks/tapestry');
const { formatViewCount } = require('../youtube.feed/resources/youtube-shared');

describe('formatViewCount', () => {
    test('formats zero views', () => {
        expect(formatViewCount(0)).toBe("0 views");
        expect(formatViewCount("0")).toBe("0 views");
    });

    test('formats singular view', () => {
        expect(formatViewCount(1)).toBe("1 view");
        expect(formatViewCount("1")).toBe("1 view");
    });

    test('formats small counts (< 1K)', () => {
        expect(formatViewCount(5)).toBe("5 views");
        expect(formatViewCount(42)).toBe("42 views");
        expect(formatViewCount(999)).toBe("999 views");
    });

    test('formats thousands (1K - 999K)', () => {
        expect(formatViewCount(1000)).toBe("1.0K views");
        expect(formatViewCount(1234)).toBe("1.2K views");
        expect(formatViewCount(1500)).toBe("1.5K views");
        expect(formatViewCount(9999)).toBe("10.0K views");
        expect(formatViewCount(10000)).toBe("10K views");
        expect(formatViewCount(57000)).toBe("57K views");
        expect(formatViewCount(999999)).toBe("999K views");
    });

    test('formats millions (1M - 999M)', () => {
        expect(formatViewCount(1000000)).toBe("1.0M views");
        expect(formatViewCount(1200000)).toBe("1.2M views");
        expect(formatViewCount(5700000)).toBe("5.7M views");
        expect(formatViewCount(10000000)).toBe("10M views");
        expect(formatViewCount(57540434)).toBe("57M views");
        expect(formatViewCount(324567890)).toBe("324M views");
        expect(formatViewCount(999999999)).toBe("999M views");
    });

    test('formats billions (1B+)', () => {
        expect(formatViewCount(1000000000)).toBe("1.0B views");
        expect(formatViewCount(1500000000)).toBe("1.5B views");
        expect(formatViewCount(10000000000)).toBe("10B views");
    });

    test('handles string input', () => {
        expect(formatViewCount("324567890")).toBe("324M views");
        expect(formatViewCount("57540434")).toBe("57M views");
        expect(formatViewCount("1234")).toBe("1.2K views");
    });

    test('handles invalid input', () => {
        expect(formatViewCount(NaN)).toBe("0 views");
        expect(formatViewCount("not a number")).toBe("0 views");
        expect(formatViewCount(-1)).toBe("0 views");
    });
});
