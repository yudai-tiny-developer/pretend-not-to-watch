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

    async function getHistoryTokens() {
        const res = await fetch("https://www.youtube.com/youtubei/v1/browse?key=" + ytcfg.data_.INNERTUBE_API_KEY + "&prettyPrint=false", {
            "headers": {
                "accept": "*/*",
                "authorization": "SAPISIDHASH " + await getSApiSidHash(document.cookie.split("SAPISID=")[1].split("; ")[0], window.origin),
                "content-type": "application/json",
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
            const items = section?.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const commands = item?.lockupViewModel?.metadata?.lockupMetadataViewModel?.menuButton?.buttonViewModel?.onTap?.innertubeCommand?.showSheetCommand?.panelLoadingStrategy?.inlineContent?.sheetViewModel?.content?.listViewModel.listItems || [];
                for (const command of commands) {
                    if (command?.listItemViewModel?.title?.content === 'Remove from watch history') {
                        const endpoint = command?.listItemViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.feedbackEndpoint;
                        if (endpoint) tokens.push({ videoId: endpoint.contentId, token: endpoint.feedbackToken });
                        break;
                    }
                }
            }
        }

        return tokens;
    }

    async function deleteHistory(feedbackToken) {
        const res = await fetch("https://www.youtube.com/youtubei/v1/feedback?key=" + ytcfg.data_.INNERTUBE_API_KEY + "&prettyPrint=false", {
            "headers": {
                "accept": "*/*",
                "authorization": "SAPISIDHASH " + await getSApiSidHash(document.cookie.split("SAPISID=")[1].split("; ")[0], window.origin),
                "content-type": "application/json",
            },
            "body": JSON.stringify({
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": ytcfg.data_.INNERTUBE_CLIENT_VERSION,
                    },
                },
                "feedbackTokens": [feedbackToken],
            }),
            "method": "POST",
        });
        return await res.json();
    }

    document.addEventListener('_pretend_not_to_watch_request', async e => {
        const targetVideoId = e.detail;

        const tokens = await getHistoryTokens();

        const entry = tokens.find((t) => t.videoId === targetVideoId);
        if (!entry) {
            document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_succeeded')); // already removed
            return;
        }

        const result = await deleteHistory(entry.token);
        if (result?.feedbackResponses[0]?.isProcessed) {
            document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_succeeded'));
            return;
        }

        document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_timeout'));
    });

    document.dispatchEvent(new CustomEvent('_pretend_not_to_watch_init'));
})();