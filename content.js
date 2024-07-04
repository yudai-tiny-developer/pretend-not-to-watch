import(chrome.runtime.getURL('common.js')).then(common => {
    if (!common.isLiveChat(location.href)) {
        main(document.querySelector('ytd-app') ?? document.body, common);
    }
});

function main(app, common) {
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

            const button = document.createElement('button');
            button.id = '_pretend_not_to_watch';
            button.innerHTML = common.label.button;
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

                button.innerHTML = '<div class="ytp-spinner" data-layer="4" style="display: block; left: 36px; top: auto; width: 28px; height: 28px"><div class="ytp-spinner-container"><div class="ytp-spinner-rotator"><div class="ytp-spinner-left"><div class="ytp-spinner-circle"></div></div><div class="ytp-spinner-right"><div class="ytp-spinner-circle"></div></div></div></div></div>' + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + common.label.button;
            });

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
        const button = app.querySelector('button#_pretend_not_to_watch');
        if (button) {
            button.innerHTML = '✔ ' + common.label.button;
            button.classList.remove('yt-spec-button-shape-next--tonal');
            button.classList.add('yt-spec-button-shape-next--filled');
        }
    });

    document.addEventListener('_pretend_not_to_watch_timeout', e => {
        const button = app.querySelector('button#_pretend_not_to_watch');
        if (button) {
            button.innerHTML = common.label.button;
        }
    });

    document.addEventListener('yt-navigate-finish', e => {
        const button = app.querySelector('button#_pretend_not_to_watch');
        if (button) {
            button.innerHTML = common.label.button;

            button.classList.remove('yt-spec-button-shape-next--filled');
            button.classList.add('yt-spec-button-shape-next--tonal');
        }
    });

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).append(s);
}