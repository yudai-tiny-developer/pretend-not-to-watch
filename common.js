export const label = {
    button: chrome.i18n.getMessage('button'),
    removing: chrome.i18n.getMessage('removing'),
    succeeded: chrome.i18n.getMessage('succeeded'),
    noTarget: chrome.i18n.getMessage('noTarget'),
    failed: chrome.i18n.getMessage('failed'),
};

export function isLiveChat(url) {
    return url.startsWith('https://www.youtube.com/live_chat?')
        || url.startsWith('https://www.youtube.com/live_chat_replay?')
        ;
}