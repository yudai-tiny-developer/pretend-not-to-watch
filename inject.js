(() => {
    function sha1(str) {
        return window.crypto.subtle.digest("SHA-1", new TextEncoder().encode(str)).then((buf) => {
            return Array.prototype.map.call(new Uint8Array(buf), (x) => ("00" + x.toString(16)).slice(-2)).join("");
        });
    };

    async function getSApiSidHash(SAPISID, origin) {
        const TIMESTAMP_SEC = Math.floor(Date.now() / 1000);
        const digest = await sha1(`${TIMESTAMP_SEC} ${SAPISID} ${origin}`);
        return `${TIMESTAMP_SEC}_${digest}`;
    };

    async function callInnertube(endpoint, body) {
        const url = `/youtubei/v1/${endpoint}?key=${ytcfg.data_.INNERTUBE_API_KEY}&prettyPrint=false&hl=en`;

        const headers = {
            "Accept-Language": "en",
            "accept": "*/*",
            "content-type": "application/json",
            "referer": window.location.href,
            "x-origin": window.origin,
            "x-goog-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
            "x-youtube-client-name": ytcfg.data_.INNERTUBE_CLIENT_NAME,
            "x-youtube-client-version": ytcfg.data_.INNERTUBE_CLIENT_VERSION,
        };

        if (ytcfg.data_.LOGGED_IN) {
            headers["x-youtube-bootstrap-logged-in"] = "true";
            const sapisidCookie = document.cookie.match(/(?:^|; )SAPISID=([^;]+)/);
            if (sapisidCookie) {
                headers["authorization"] = `SAPISIDHASH ${await getSApiSidHash(sapisidCookie[1], window.origin)}`;
            }
        }

        if (ytcfg.data_.SESSION_INDEX !== undefined) headers["x-goog-authuser"] = ytcfg.data_.SESSION_INDEX;
        if (ytcfg.data_.VISITOR_DATA) headers["x-goog-visitor-id"] = ytcfg.data_.VISITOR_DATA;
        if (ytcfg.data_.DELEGATED_SESSION_ID) headers["x-goog-pageid"] = ytcfg.data_.DELEGATED_SESSION_ID;

        const context = { ...ytcfg.data_.INNERTUBE_CONTEXT };
        if (context.client) {
            context.client = { ...context.client };
            delete context.client.hl;

            context.request = {
                ...context.request,
                internalExperimentFlags: [],
                consistencyTokenJars: [],
            };
        }

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
                context,
                ...body
            }),
        });

        return res.json();
    }

    async function getHistoryTokens(targetVideoId) {
        const res = await callInnertube("browse", {
            "browseId": "FEhistory",
        });

        const tokens = [];

        findObjectsByValue(res, targetVideoId).forEach(item => {
            // video
            for (const listItemViewModel of findValuesByKey(item, 'listItemViewModel')) {
                if (listItemViewModel.title?.content === 'Remove from watch history') {
                    const feedbackToken = findFirstValueByKey(listItemViewModel, 'feedbackToken');
                    if (feedbackToken) {
                        tokens.push(feedbackToken);
                        break;
                    }
                }
            }

            // shorts
            for (const menuServiceItemRenderer of findValuesByKey(item, 'menuServiceItemRenderer')) {
                if (menuServiceItemRenderer.text?.runs[0]?.text === 'Remove from watch history') {
                    const feedbackToken = findFirstValueByKey(menuServiceItemRenderer, 'feedbackToken');
                    if (feedbackToken) {
                        tokens.push(feedbackToken);
                        break;
                    }
                }
            }
        });

        return tokens;
    }

    async function deleteHistoryByTokens(feedbackTokens) {
        return await callInnertube("feedback", {
            "feedbackTokens": feedbackTokens,
        });
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

    function findValuesByKey(root, targetKey) {
        const results = [];
        const stack = [root];
        const visited = new WeakSet();

        while (stack.length) {
            const current = stack.pop();

            if (current === null || typeof current !== "object") continue;
            if (visited.has(current)) continue;
            visited.add(current);

            if (Array.isArray(current)) {
                for (let i = 0; i < current.length; i++) {
                    stack.push(current[i]);
                }
            } else {
                const keys = Object.keys(current);
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    const value = current[k];

                    if (k === targetKey) {
                        results.push(value);
                    }

                    if (value && typeof value === "object") {
                        stack.push(value);
                    }
                }
            }
        }

        return results;
    }

    function findObjectsByValue(root, targetValue) {
        const results = [];
        const stack = [root];
        const visited = new WeakSet();

        while (stack.length) {
            const current = stack.pop();

            if (current === null || typeof current !== "object") continue;
            if (visited.has(current)) continue;
            visited.add(current);

            if (Array.isArray(current)) {
                for (let i = 0; i < current.length; i++) {
                    stack.push(current[i]);
                }
            } else {
                const keys = Object.keys(current);
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    const value = current[k];

                    if (value === targetValue) {
                        results.push(current);
                    }

                    if (value && typeof value === "object") {
                        stack.push(value);
                    }
                }
            }
        }

        return results;
    }

    function findFirstValueByKey(root, targetKey) {
        const stack = [root];
        const visited = new WeakSet();

        while (stack.length) {
            const current = stack.pop();

            if (current === null || typeof current !== "object") continue;
            if (visited.has(current)) continue;
            visited.add(current);

            if (Array.isArray(current)) {
                for (let i = 0; i < current.length; i++) {
                    stack.push(current[i]);
                }
            } else {
                const keys = Object.keys(current);
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    const value = current[k];

                    if (k === targetKey) {
                        return value;
                    }

                    if (value && typeof value === "object") {
                        stack.push(value);
                    }
                }
            }
        }

        return undefined;
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