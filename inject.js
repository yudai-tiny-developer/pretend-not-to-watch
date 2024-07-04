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

        let reload_count = 0;
        iframe.onload = () => {
            let mutation_count = 0;
            new MutationObserver((mutations, observer) => {
                if (mutation_count++ < 3) {
                    if (click_remove_history_button(iframe, video_data.video_id)) {
                        observer.disconnect();
                        document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_succeeded'));
                        open_toast(e.detail.toast);
                    } else {
                        console.log('video not found from watch history');
                    }
                } else {
                    if (reload_count++ < 3) {
                        console.log('reloading watch history');
                        observer.disconnect();
                        iframe.contentWindow.location.reload();
                    } else {
                        console.log('video not found from watch history');
                        observer.disconnect();
                        document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_timeout'));
                    }
                }
            }).observe(iframe.contentDocument, { childList: true, subtree: true });
        };

        iframe.contentWindow.location.reload();
    });

    document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_init'));
}