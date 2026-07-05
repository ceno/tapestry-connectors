// Mock Tapestry classes for Jest testing
// Based on the compatibility layer used by youtube.feed.test

global.Identity = {
    createWithName: (name) => ({
        name,
        username: null,
        uri: null,
        avatar: null
    })
};

global.Item = {
    createWithUriDate: (uri, date) => ({
        uri,
        date,
        title: null,
        body: null,
        author: null,
        attachments: null,
        annotations: null
    })
};

global.MediaAttachment = {
    createWithUrl: (url) => ({
        _type: 'media',
        url,
        mimeType: null,
        aspectSize: null,
        text: null
    })
};

global.LinkAttachment = {
    createWithUrl: (url) => ({
        _type: 'link',
        url,
        title: null,
        siteName: null,
        image: null,
        aspectSize: null
    })
};

global.Annotation = {
    createWithText: (text) => ({
        text,
        uri: null,
        icon: null
    })
};

module.exports = {
    Identity: global.Identity,
    Item: global.Item,
    MediaAttachment: global.MediaAttachment,
    LinkAttachment: global.LinkAttachment,
    Annotation: global.Annotation
};
