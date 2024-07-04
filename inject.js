const _pretend_not_to_watch_app = document.querySelector('ytd-app') ?? document.body;

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

    iframe.onload = () => {
        console.log(`onload: ${iframe.contentDocument.querySelector('ytd-video-renderer ytd-button-renderer')}`);
        if (click_remove_history_button(iframe, video_data.video_id)) {
            console.log('Succeeded');
        } else {
            const observer = new MutationObserver((mutations, observer) => {
                console.log('Mutation...');
                if (click_remove_history_button(iframe, video_data.video_id)) {
                    observer.disconnect();
                    console.log('Succeeded');
                }
            });

            observer.observe(iframe.contentDocument, { childList: true, subtree: true });

            setTimeout(() => {
                console.log('Timeout');
                observer.disconnect();
            }, 4000);
        }
    };

    console.log('Reload History');
    iframe.contentWindow.location.reload();
});

document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_init'));