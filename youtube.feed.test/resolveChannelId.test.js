// resolveChannelId.test.js - Tests for handle → channel_id resolution

require('../youtube.feed.test/mocks/tapestry');
const fs = require('fs');
const path = require('path');

// We need to mock sendRequest before requiring the module
global.sendRequest = jest.fn();

const { resolveChannelId } = require('../youtube.feed/resources/youtube-shared');

// Load the channel page fixture
const channelPageHtml = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'channel-page.html'),
    'utf-8'
);

describe('resolveChannelId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns channel ID directly if handle starts with UC', async () => {
        const result = await resolveChannelId('UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(result.channelId).toBe('UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(result.channelName).toBe('UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(result.channelAvatar).toBeNull();
        // Should NOT have called sendRequest
        expect(sendRequest).not.toHaveBeenCalled();
    });

    test('strips @ prefix and resolves handle', async () => {
        sendRequest.mockResolvedValue(channelPageHtml);

        const result = await resolveChannelId('@MrBeast');
        expect(result.channelId).toBe('UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(result.channelName).toBe('MrBeast');
        expect(result.channelAvatar).toBe('https://yt3.googleusercontent.com/ytc/AIdro_lGRc-05Bp3gOzndYOP3carLSiEkIYC-bKzYzGJYA=s900-c-k-c0x00ffffff-no-rj');
        expect(sendRequest).toHaveBeenCalledWith(
            'https://www.youtube.com/@MrBeast',
            'GET',
            null,
            expect.objectContaining({
                'user-agent': expect.any(String),
                'cookie': 'CONSENT=YES+cb'
            })
        );
    });

    test('resolves handle without @ prefix', async () => {
        sendRequest.mockResolvedValue(channelPageHtml);

        const result = await resolveChannelId('MrBeast');
        expect(result.channelId).toBe('UCX6OQ3DkcsbYNE6H8uQQuVA');
        expect(sendRequest).toHaveBeenCalledWith(
            'https://www.youtube.com/@MrBeast',
            'GET',
            null,
            expect.objectContaining({ 'cookie': 'CONSENT=YES+cb' })
        );
    });

    test('trims whitespace from handle', async () => {
        sendRequest.mockResolvedValue(channelPageHtml);

        const result = await resolveChannelId('  MrBeast  ');
        expect(result.channelId).toBe('UCX6OQ3DkcsbYNE6H8uQQuVA');
    });

    test('throws error for empty handle', async () => {
        await expect(resolveChannelId('')).rejects.toThrow('No YouTube handle provided');
        await expect(resolveChannelId(null)).rejects.toThrow('No YouTube handle provided');
        await expect(resolveChannelId(undefined)).rejects.toThrow('No YouTube handle provided');
    });

    test('throws error when sendRequest fails', async () => {
        sendRequest.mockRejectedValue(new Error('Network error'));

        await expect(resolveChannelId('InvalidHandle'))
            .rejects.toThrow('Could not load YouTube channel page for @InvalidHandle');
    });

    test('throws error when channel ID not found in page', async () => {
        sendRequest.mockResolvedValue('<html><head><title>Not Found</title></head><body></body></html>');

        await expect(resolveChannelId('NonExistentChannel'))
            .rejects.toThrow('Could not find channel ID for @NonExistentChannel');
    });

    test('throws error for empty response', async () => {
        sendRequest.mockResolvedValue('');

        await expect(resolveChannelId('SomeHandle'))
            .rejects.toThrow('Empty response from YouTube channel page');
    });

    test('extracts channel ID from externalId as fallback', async () => {
        // HTML with only the externalId JSON field, no RSS or canonical link
        const htmlWithExternalIdOnly = `<html><head>
            <title>TestChannel - YouTube</title>
            <meta property="og:image" content="https://example.com/avatar.jpg">
            </head><body>
            <script>var data = {"externalId":"UCabcdefghijklmnopqrstuv"};</script>
            </body></html>`;
        sendRequest.mockResolvedValue(htmlWithExternalIdOnly);

        const result = await resolveChannelId('TestChannel');
        expect(result.channelId).toBe('UCabcdefghijklmnopqrstuv');
        expect(result.channelName).toBe('TestChannel');
    });

    test('extracts channel ID from canonical URL', async () => {
        const htmlWithCanonical = `<html><head>
            <title>CanonicalChannel - YouTube</title>
            <link rel="canonical" href="https://www.youtube.com/channel/UCcanonical12345678901">
            <meta property="og:image" content="https://example.com/avatar.jpg">
            </head><body></body></html>`;
        sendRequest.mockResolvedValue(htmlWithCanonical);

        const result = await resolveChannelId('CanonicalChannel');
        expect(result.channelId).toBe('UCcanonical12345678901');
    });

    test('extracts channel name from title tag', async () => {
        sendRequest.mockResolvedValue(channelPageHtml);

        const result = await resolveChannelId('MrBeast');
        expect(result.channelName).toBe('MrBeast');
    });
});
