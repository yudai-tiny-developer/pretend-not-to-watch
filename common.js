export const label = {
    button: chrome.i18n.getMessage('button'),
    toast: chrome.i18n.getMessage('toast'),
};

export function isLiveChat(url) {
    return url.startsWith('https://www.youtube.com/live_chat?')
        || url.startsWith('https://www.youtube.com/live_chat_replay?')
        ;
}