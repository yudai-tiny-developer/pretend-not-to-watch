(() => {
    function sha1(str) {
        return window.crypto.subtle.digest("SHA-1", new TextEncoder().encode(str)).then((buf) => {
            return Array.prototype.map.call(new Uint8Array(buf), (x) => ("00" + x.toString(16)).slice(-2)).join("");
        });
    };

    async function getSApiSidHash(SAPISID, origin) {
        const TIMESTAMP_MS = Date.now();
        const digest = await sha1(`${TIMESTAMP_MS} ${SAPISID} ${origin}`);
        return `${TIMESTAMP_MS}_${digest}`;
    };

    async function getHistoryTokens(targetVideoId) {
        const res = await fetch("https://www.youtube.com/youtubei/v1/browse?key=" + ytcfg.data_.INNERTUBE_API_KEY + "&prettyPrint=false", {
            "headers": {
                "accept": "*/*",
                "authorization": "SAPISIDHASH " + await getSApiSidHash(document.cookie.split("SAPISID=")[1]?.split("; ")[0], window.origin),
                "content-type": "application/json",
                "x-goog-authuser": ytcfg.data_.SESSION_INDEX,
                "x-goog-pageid": ytcfg.data_.DELEGATED_SESSION_ID,
            },
            "body": JSON.stringify({
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": ytcfg.data_.INNERTUBE_CLIENT_VERSION,
                    },
                },
                "browseId": "FEhistory",
            }),
            "method": "POST",
        });
        const data = await res.json();

        const tokens = [];
        const sections = data?.contents?.twoColumnBrowseResultsRenderer?.tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const section of sections) {
            const section_items = section?.itemSectionRenderer?.contents || [];
            for (const item of section_items) {
                const lockup_commands = item?.lockupViewModel?.metadata?.lockupMetadataViewModel?.menuButton?.buttonViewModel?.onTap?.innertubeCommand?.showSheetCommand?.panelLoadingStrategy?.inlineContent?.sheetViewModel?.content?.listViewModel.listItems || [];
                for (const command of lockup_commands) {
                    if (command?.listItemViewModel?.title?.content === 'Remove from watch history') {
                        const endpoint = command?.listItemViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.feedbackEndpoint;
                        if (endpoint?.contentId === targetVideoId) tokens.push(endpoint.feedbackToken);
                        break;
                    }
                }

                const video_commands = item?.videoRenderer?.menu?.menuRenderer?.items || [];
                for (const command of video_commands) {
                    if (command?.menuServiceItemRenderer?.text?.runs[0]?.text === 'Remove from watch history') {
                        const endpoint = command?.menuServiceItemRenderer?.serviceEndpoint?.feedbackEndpoint;
                        if (endpoint?.contentId === targetVideoId) tokens.push(endpoint.feedbackToken);
                        break;
                    }
                }

                const reel_items = item?.reelShelfRenderer?.items || [];
                for (const item of reel_items) {
                    const commands = item?.shortsLockupViewModel?.menuOnTap?.innertubeCommand?.showSheetCommand?.panelLoadingStrategy?.inlineContent?.sheetViewModel?.content?.listViewModel.listItems || [];
                    for (const command of commands) {
                        if (command?.listItemViewModel?.title?.content === 'Remove from watch history') {
                            const endpoint = command?.listItemViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.feedbackEndpoint;
                            if (endpoint?.contentId === targetVideoId) tokens.push(endpoint.feedbackToken);
                            break;
                        }
                    }
                }
            }
        }

        return tokens;
    }

    async function deleteHistoryByTokens(feedbackTokens) {
        const res = await fetch("https://www.youtube.com/youtubei/v1/feedback?key=" + ytcfg.data_.INNERTUBE_API_KEY + "&prettyPrint=false", {
            "headers": {
                "accept": "*/*",
                "authorization": "SAPISIDHASH " + await getSApiSidHash(document.cookie.split("SAPISID=")[1].split("; ")[0], window.origin),
                "content-type": "application/json",
                "x-goog-authuser": ytcfg.data_.SESSION_INDEX,
                "x-goog-pageid": ytcfg.data_.DELEGATED_SESSION_ID,
            },
            "body": JSON.stringify({
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": ytcfg.data_.INNERTUBE_CLIENT_VERSION,
                    },
                },
                "feedbackTokens": feedbackTokens,
            }),
            "method": "POST",
        });
        return await res.json();
    }

    function getVideoIdFromUrl(url) {
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

    async function removeFromHistory(videoId) {
        for (let retry_count = 0; retry_count < 4; retry_count++) {
            const tokens = await getHistoryTokens(videoId);
            if (!tokens || tokens.length === 0) {
                continue;
            }

            const result = await deleteHistoryByTokens(tokens);
            if (result?.feedbackResponses[0]?.isProcessed) {
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_succeeded'));
            } else {
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_failed'));
            }
        }
    }

    document.addEventListener('_pretend_not_to_watch_request', async () => {
        const playerResponse = document.getElementById("movie_player")?.getPlayerResponse();
        if (playerResponse) { // video
            const videoId = playerResponse?.playabilityStatus?.errorScreen?.ypcTrailerRenderer?.unserializedPlayerResponse?.videoDetails?.videoId ?? playerResponse?.videoDetails?.videoId;
            if (videoId) {
                removeFromHistory(videoId);
            } else {
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_noTarget'));
            }
        } else { // shorts
            const videoId = getVideoIdFromUrl(location.href);
            if (videoId) {
                removeFromHistory(videoId);
            } else {
                document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_noTarget'));
            }
        }
    });

    document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_init'));
})();