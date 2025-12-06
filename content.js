import(chrome.runtime.getURL('common.js')).then(common => {
    if (!common.isLiveChat(location.href)) {
        main(document.querySelector('ytd-app') ?? document.body, common);
    }
});

function main(app, common) {
    const TRASH = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" style="pointer-events: none; display: inherit; width: 24px; height: 24px;"><path d="M11 17H9V8h2v9zm4-9h-2v9h2V8zm4-4v1h-1v16H6V5H5V4h4V3h6v1h4zm-2 1H7v15h10V5z"></path></svg>';
    const LOADING = '<div class="ytp-spinner" data-layer="4" style="display: block; position: relative; width: 26px; height: 26px; left: 0px; top: 0px; margin: auto;"><div class="ytp-spinner-container" style="left: 25%;"><div class="ytp-spinner-rotator"><div class="ytp-spinner-left"><div class="ytp-spinner-circle" style="border-width: 4px;"></div></div><div class="ytp-spinner-right"><div class="ytp-spinner-circle" style="border-width: 4px;"></div></div></div></div></div>';

    function loadSettings() {
        create_button();
    }

    function getYouTubeID(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const u = new URL(url);
            const path = u.pathname;

            if (u.searchParams.has('v')) {
                const v = u.searchParams.get('v');
                return v;
            }

            const parts = path.split('/');
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                if (['embed', 'v', 'shorts', 'live'].includes(p) && parts[i + 1]) {
                    return parts[i + 1];
                }
            }

            if (u.searchParams.has('video_id')) {
                const vid = u.searchParams.get('video_id');
                return vid;
            }

            const fallback = url.match(/([A-Za-z0-9_-]{11})/g);
            if (fallback) {
                for (const cand of fallback) {
                    return cand;
                }
            }

            return null;
        } catch (e) {
            return null;
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
            text.id = '_pretend_not_to_watch_text';
            text.classList.add('yt-spec-button-shape-next__button-text-content');
            text.innerHTML = common.label.button;

            const button = document.createElement('button');
            button.id = '_pretend_not_to_watch_button';
            button.classList.add(
                'yt-spec-button-shape-next',
                'yt-spec-button-shape-next--tonal',
                'yt-spec-button-shape-next--mono',
                'yt-spec-button-shape-next--size-m'
            );
            button.disabled = false;
            button.addEventListener('click', () => {
                const detail = getYouTubeID(location.href);
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_request', { detail }));

                icon.innerHTML = LOADING;
                button.disabled = true;
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
            icon.classList.remove('_pretend_not_to_watch_timeout');
        }

        const text = app.querySelector('div#_pretend_not_to_watch_text');
        if (text) {
            text.innerHTML = common.label.succeeded;
            text.classList.remove('_pretend_not_to_watch_timeout');
        }

        const button = app.querySelector('button#_pretend_not_to_watch_button');
        if (button) {
            button.disabled = true;
        }
    });

    document.addEventListener('_pretend_not_to_watch_timeout', e => {
        const icon = app.querySelector('div#_pretend_not_to_watch_icon');
        if (icon) {
            icon.innerHTML = TRASH;
            icon.classList.add('_pretend_not_to_watch_timeout');
        }

        const text = app.querySelector('div#_pretend_not_to_watch_text');
        if (text) {
            text.innerHTML = common.label.timeout;
            text.classList.add('_pretend_not_to_watch_timeout');
        }

        const button = app.querySelector('button#_pretend_not_to_watch_button');
        if (button) {
            button.disabled = false;
        }
    });

    document.addEventListener('yt-navigate-finish', e => {
        const icon = app.querySelector('div#_pretend_not_to_watch_icon');
        if (icon) {
            icon.innerHTML = TRASH;
            icon.classList.remove('_pretend_not_to_watch_timeout');
        }

        const text = app.querySelector('div#_pretend_not_to_watch_text');
        if (text) {
            text.innerHTML = common.label.button;
            text.classList.remove('_pretend_not_to_watch_timeout');
        }

        const button = app.querySelector('button#_pretend_not_to_watch_button');
        if (button) {
            button.disabled = false;
        }
    });

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('inject.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).append(s);
}