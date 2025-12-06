export const label = {
    button: chrome.i18n.getMessage('button'),
    succeeded: chrome.i18n.getMessage('succeeded'),
    timeout: chrome.i18n.getMessage('timeout'),
};

export function isLiveChat(url) {
    return url.startsWith('https://www.youtube.com/live_chat?')
        || url.startsWith('https://www.youtube.com/live_chat_replay?')
        ;
}