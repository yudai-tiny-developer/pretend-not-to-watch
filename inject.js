const _pretend_not_to_watch_app = document.querySelector('ytd-app');
if (_pretend_not_to_watch_app) {
    function click_remove_history_button(iframe, video_id) {
        for (const button_renderer of iframe.contentDocument.querySelectorAll('ytd-video-renderer ytd-button-renderer')) {
            if (button_renderer.data.serviceEndpoint.feedbackEndpoint.contentId === video_id) {
                const button = button_renderer.querySelector('button');
                if (button) {
                    button.click();
                    return true;
                }
            }
        }
        return false;
    }

    function open_toast(simpleText) {
        _pretend_not_to_watch_app.resolveCommand({
            openPopupAction: {
                popup: {
                    notificationActionRenderer: {
                        responseText: {
                            simpleText
                        }
                    }
                },
                popupType: 'TOAST'
            }
        });
    }

    document.addEventListener('_pretend_not_to_watch_request', e => {
        const iframe = document.body.querySelector('iframe#_pretend_not_to_watch');
        if (!iframe) {
            return;
        }

        const player = _pretend_not_to_watch_app.querySelector('div#movie_player');
        if (!player) {
            return;
        }

        const video_data = player.getVideoData();
        if (!video_data) {
            return;
        }

        const interval = setInterval(() => {
            iframe.contentWindow.location.reload();
        }, 2000);

        iframe.onload = () => {
            const observer = new MutationObserver((mutations, observer) => {
                if (click_remove_history_button(iframe, video_data.video_id)) {
                    clearInterval(interval);
                    observer.disconnect();
                    document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_succeeded'));
                    open_toast(e.detail.toast);
                }
            });
            observer.observe(iframe.contentDocument, { childList: true, subtree: true });
            setTimeout(() => {
                clearInterval(interval);
                observer.disconnect();
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_timeout'));
            }, 5000);
        };
    });

    document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_init'));
}