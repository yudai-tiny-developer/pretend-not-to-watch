import(chrome.runtime.getURL('common.js')).then(common => {
    if (!common.isLiveChat(location.href)) {
        main(document.querySelector('ytd-app') ?? document.body, common);
    }
});

function main(app, common) {
    const TRASH = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: inherit; width: 24px; height: 24px;"><path d="M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H7v15h10V5z"></path></svg>';
    const LOADING = '<div class="ytp-spinner" data-layer="4" style="display: block; position: relative; width: 26px; height: 26px; left: 0px; top: 0px; margin: auto;"><div class="ytp-spinner-container" style="left: 25%;"><div class="ytp-spinner-rotator"><div class="ytp-spinner-left"><div class="ytp-spinner-circle" style="border-width: 4px;"></div></div><div class="ytp-spinner-right"><div class="ytp-spinner-circle" style="border-width: 4px;"></div></div></div></div></div>';

    function loadSettings() {
        create_history_iframe();
        create_button();
    }

    function create_history_iframe() {
        if (!window.parent.document.querySelector('iframe#_pretend_not_to_watch')) {
            iframe = document.createElement('iframe');
            iframe.id = '_pretend_not_to_watch';
            iframe.src = 'https://www.youtube.com/feed/history';
            iframe.loading = 'lazy';
            document.body.appendChild(iframe);
        }
    }

    function create_button() {
        const area = app.querySelector('ytd-menu-renderer.ytd-watch-metadata');
        if (area) {
            area.querySelectorAll('button#_pretend_not_to_watch').forEach(b => b.remove());

            const icon = document.createElement('div');
            icon.id = '_pretend_not_to_watch_icon';
            icon.classList.add('yt-spec-button-shape-next__icon');
            icon.innerHTML = TRASH;

            const text = document.createElement('div');
            text.classList.add('yt-spec-button-shape-next__button-text-content');
            text.innerHTML = common.label.button;

            const button = document.createElement('button');
            button.classList.add(
                'yt-spec-button-shape-next',
                'yt-spec-button-shape-next--tonal',
                'yt-spec-button-shape-next--mono',
                'yt-spec-button-shape-next--size-m'
            );
            button.addEventListener('click', () => {
                const detail = {
                    toast: common.label.toast
                };
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_request', { detail }));

                icon.innerHTML = LOADING;
            });
            button.appendChild(icon);
            button.appendChild(text);

            const div = document.createElement('div');
            div.classList.add('style-scope', 'ytd-menu-renderer');
            div.style.marginRight = '8px';
            div.appendChild(button);

            area.insertBefore(div, area.firstChild);
        }
    }

    document.addEventListener('_pretend_not_to_watch_init', e => {
        new MutationObserver((mutations, observer) => {
            if (app.querySelector('ytd-menu-renderer.ytd-watch-metadata')) {
                observer.disconnect();
                loadSettings();
            }
        }).observe(app, { childList: true, subtree: true });
        loadSettings();
    });

    document.addEventListener('_pretend_not_to_watch_succeeded', e => {
        const icon = app.querySelector('div#_pretend_not_to_watch_icon');
        if (icon) {
            icon.innerHTML = TRASH;
        }
    });

    document.addEventListener('_pretend_not_to_watch_timeout', e => {
        const icon = app.querySelector('div#_pretend_not_to_watch_icon');
        if (icon) {
            icon.innerHTML = TRASH;
        }
    });

    document.addEventListener('yt-navigate-finish', e => {
        const icon = app.querySelector('div#_pretend_not_to_watch_icon');
        if (icon) {
            icon.innerHTML = TRASH;
        }
    });

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).append(s);
}