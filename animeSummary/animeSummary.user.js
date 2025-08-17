// ==UserScript==
// @name         Anime Summary
// @namespace    http://tampermonkey.net/
// @version      1.33
// @description  A kinda customisable userscript querying anilist for summary + cover of the previous rounds anime and then display it.
// @author       Mooero
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Tree-Ro/amq-scripts/raw/main/animeSummary/animeSummary.user.js
// @updateURL    https://github.com/Tree-Ro/amq-scripts/raw/main/animeSummary/animeSummary.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- User Config (safe to change) ---
    const TITLE_PREFERENCE = 'romaji';     // 'native', 'romaji', or 'english'
    const BLUR_SUMMARY = true;             // Set to true to blur summary (unblur on hover)
    const BLUR_AMOUNT = 3;                 // Amount of blur in px (e.g. 5 for 'blur(5px)')

    // AlwaysOn Mode: Show info during `answer results`, stays until next `answer results`. In other words the Info Box is always on.
    // Best for ranked mode or when video is off (otherwise overlaps video).
    const ALWAYS_ON_TOGGLE_KEYBIND = { key: 'S', shift: true, ctrl: false, alt: false }; // Default Toggle: Shift+S.


    const LOG_ENABLED = false;              // Set to true to enable logging
    const ANILIST_API_LIMIT = 20;           // Shouldn't be an issue unless you spam vote skip instantly or play 1sec guess phases etc..
                                            // requests per minute https://docs.anilist.co/guide/rate-limiting.

    const CACHE_MAX_ENTRIES = 800;          // Entries from Anilist are cached in localStorage to lessen the load on the API.
                                            // 800 Entries will be about 1MiB~ of your total 5MiB localStorage quota. Reduce this if you have other scripts that use a lot of space.

    // My CSS skills are def supbar so this is a reminder that you can update the CSS styles below to customize the appearance of the anime info box.
    // Definitely expecting it to break on different screen sizes etc. from my own.
    // --- End of User Config (safe to change) ---




    // --- Internal Constants (not recommended to change) ---
    const CACHE_KEY = 'AnimeSummary_Cache';
    const CACHE_LRU_KEY = 'AnimeSummary_CacheLRU';
    const ALWAYS_ON_MODE_KEY = 'AnimeSummary_AlwaysOn';
    const CONTAINER_SELECTOR = '#qpVideoOverflowContainer'; // Container where the anime info box will be appended
    const ALWAYS_ON_MODE_DEFAULT = false;
    const API_URL = 'https://graphql.anilist.co';
    const HIDE_ON_INFO_SELECTORS = [    // Elements that will be hidden when anime info is displayed
        '#qpHiderText',                 // The numeric timer and text that says "Answers"
        '#qpVideosUserHidden',          // The element allowing you to "Click to Reveal" and that says "Video Hidden"
    ];
    const EVENT_NAMES = {
        STORE: 'answer results',      // Store anime ID for later display
        SHOW: 'play next song',       // Show anime info
        HIDE: 'guess phase over',     // Hide anime info
    };
    

    // --- Internal State ---
    let lastApiReset = 0;
    let apiCount = 0;
    let currentAnimeId = null;
    let lastDisplayNode = null;
    let hiddenElements = [];
    let lastGamePhase = null; 

    function log(msg, ...args) {
        if (LOG_ENABLED) console.log(`[AnimeSummary] ${msg}`, ...args);
    }

    // --- Cache ---
    function getCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            let lru = JSON.parse(localStorage.getItem(CACHE_LRU_KEY) || '[]');
            if (!Array.isArray(lru)) lru = [];
            cache._lru = lru;
            return cache;
        } catch (e) {
            log('Cache parse failed', e);
            return { _lru: [] };
        }
    }

    // Trims and sets the cache in localStorage
    function setCache(cache) {
        let lru = cache._lru || [];
        delete cache._lru;
        let safety = 0;
        let reset = false;

        if (lru.length !== Object.keys(cache).length) {
            log('LRU length mismatch, resetting cache');
            reset = true;
        }

        while (Object.keys(cache).length > CACHE_MAX_ENTRIES && reset === false) {
            // Remove the oldest entry from cache and LRU
            const oldest = lru.shift();
            if (oldest && cache.hasOwnProperty(oldest)) {
                delete cache[oldest];
                log('Deleting oldest cache entry', oldest);
            }
           
            if (++safety > CACHE_MAX_ENTRIES + 10) {
                log('Safety break in setCache: possible infinite loop. Resetting cache.');
                reset = true;
                break;
            }
        }
        // Safeguard: Reset both caches since there is likely inconsistent state issues
        if (reset) {
            localStorage.setItem(CACHE_KEY, '{}');
            localStorage.setItem(CACHE_LRU_KEY, '[]');
        } else {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            localStorage.setItem(CACHE_LRU_KEY, JSON.stringify(lru));
        }
    }

    // --- LRU Cache Helpers ---
    function getFromCache(animeId) {
        const cache = getCache();
        const info = cache[animeId];
        if (info) {
            touchCacheEntry(animeId, cache);
            setCache(cache);
        }
        return info;
    }

    // Set anime info in cache, updating the LRU list
    function setInCache(animeId, info) {
        const cache = getCache();
        cache[animeId] = info;
        touchCacheEntry(animeId, cache);
        setCache(cache);
    }

    // Touch the cache entry to mark it as recently used
    function touchCacheEntry(animeId, cache) {
        let lru = cache._lru || [];
        lru = lru.filter(k => k !== animeId);
        lru.push(animeId);
        cache._lru = lru;
    }

    // --- Extract anime ID from event data ---
    function extractAnimeId(eventData) {
        const idFromEventData = eventData?.songInfo?.siteIds?.aniListId;
        if (idFromEventData) return idFromEventData;

        // Backup: scan DOM for AniList links
        log('No ID in event data, scanning DOM for AniList links');
        const link = Array.from(document.querySelectorAll('a[href*="anilist.co/anime/"]'))
                        .map(a => a.href.match(/anilist\.co\/anime\/(\d+)/))
                        .find(m => m);
        return link ? link[1] : null;
    }

    // --- AlwaysOn Mode Helpers ---
    function getAlwaysOnMode() {
        const val = localStorage.getItem(ALWAYS_ON_MODE_KEY);
        return val === null ? ALWAYS_ON_MODE_DEFAULT : val === 'true';
    }
    function setAlwaysOnMode(val) {
        localStorage.setItem(ALWAYS_ON_MODE_KEY, val ? 'true' : 'false');
    }
    function showToggleNotification(enabled) {
        if (typeof gameChat !== 'undefined' && typeof gameChat.systemMessage === 'function') {
            gameChat.systemMessage(`[AnimeSummary] AlwaysOn Mode Toggled ${enabled ? 'ON' : 'OFF'}`);
        }
    }

    // --- AniList Fetching GraphQl o_o ---
    async function fetchAnimeInfo(id) {
        const now = Date.now();
        if (now - lastApiReset > 60_000) { apiCount = 0; lastApiReset = now; }
        if (apiCount >= ANILIST_API_LIMIT) {
            log('API limit reached, skipping request');
            return null;
        }
        apiCount++;
        const query = `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english native } coverImage { large } description(asHtml: false) } }`;
        const variables = { id: Number(id) };
        try {
            let resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            });
            if (resp.status === 429) {
                log('Rate limited');
                return null;
            }
            if (!resp.ok) { log('Fetch failed', resp.status); return null; }
            const data = await resp.json();
            return data.data && data.data.Media ? data.data.Media : null;
        } catch (e) {
            log('Fetch error', e);
            return null;
        }
    }

    // Clean up 1
    function removePreviousAnimeInfoBox() {
        if (lastDisplayNode && lastDisplayNode.parentNode) {
            lastDisplayNode.remove();
            log('Removed previous display', lastDisplayNode);
            lastDisplayNode = null;
        }
    }

    // Clean up 2
    function hideConfiguredElements() {
        hiddenElements = [];
        for (const selector of HIDE_ON_INFO_SELECTORS) {
            document.querySelectorAll(selector).forEach(el => {
                hiddenElements.push({ el, prev: el.style.display });
                el.style.display = 'none';
                log('Hiding element', el);
            });
        }
    }

    function createAnimeInfoBox(info) {
        // Container
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.top = '50%';
        box.style.left = '50%';
        box.style.display = 'flex';
        box.style.alignItems = 'flex-start';
        box.style.gap = '16px';
        box.style.color = '#fff';
        box.style.padding = '12px';
        box.style.borderRadius = '8px';
        box.style.margin = '8px 0';
        box.style.inset = '10% 5%';
        box.style.display = 'flex';
        box.style.fontSize = '15px';
        box.style.zIndex = '2147483647';

        // Cover
        const img = document.createElement('img');
        img.src = info.coverImage?.large || '';
        img.alt = 'Cover';
        img.style.flex = '2'
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';

        // Text
        const text = document.createElement('div');
        text.style.flex = '5';
        let title = 'Unknown';
        if (TITLE_PREFERENCE === 'native') title = info.title?.native || info.title?.english || info.title?.romaji || 'ERROR: Unknown';
        else if (TITLE_PREFERENCE === 'romaji') title = info.title?.romaji || info.title?.english || info.title?.native || 'ERROR: Unknown';
        else title = info.title?.english || info.title?.romaji || info.title?.native || 'ERROR: Unknown';
        
        const summaryId = 'amqAnimeSummaryText';
        const titleEl = document.createElement('b');
        titleEl.style.fontSize = '1.1em';
        titleEl.textContent = title;

        const summaryEl = document.createElement('div');
        summaryEl.id = summaryId;
        summaryEl.style.marginTop = '6px';
        summaryEl.style.maxHeight = '25vh';
        summaryEl.style.overflow = 'auto';
        if (BLUR_SUMMARY) {
            summaryEl.style.filter = `blur(${BLUR_AMOUNT}px)`;
            summaryEl.style.transition = 'filter 0.2s';
            summaryEl.style.cursor = 'pointer';
        }
        summaryEl.innerHTML = info.description || 'No summary available.';

        text.appendChild(titleEl);
        text.appendChild(summaryEl);



        box.appendChild(img);
        box.appendChild(text);
        return { box, summaryId };
    }

    // --- Setup Blur Events ---
    function setupBlurEvents(summaryId) {
        if (BLUR_SUMMARY) {
            setTimeout(() => {
                const summaryDiv = document.getElementById(summaryId);
                if (summaryDiv) {
                    summaryDiv.addEventListener('mouseenter', () => {
                        summaryDiv.style.filter = 'none';
                    });
                    summaryDiv.addEventListener('mouseleave', () => {
                        summaryDiv.style.filter = `blur(${BLUR_AMOUNT}px)`;
                    });
                }
            }, 0);
        }
    }

    // --- Remedies the current state of the info shown ---
    async function remedyAlwaysOnDisplay(isAlwaysOn) {
        log('RemedyAlwaysOnDisplay called', { isAlwaysOn, currentAnimeId, lastGamePhase });
        if (!isAlwaysOn) {
            if (lastGamePhase === EVENT_NAMES.STORE) {
                hideAnimeInfo();
            }
            return;
        }
        if (!currentAnimeId) {
            hideAnimeInfo();
            return;
        }
        let info = getFromCache(currentAnimeId);
        if (info) {
            showAnimeInfo(info);
            return;
        }
        info = await fetchAnimeInfo(currentAnimeId);
        if (info) {
            setInCache(currentAnimeId, info);
            showAnimeInfo(info);
        } else {
            hideAnimeInfo();
        }
    }

    // --- guess what this one does! ---
    function showAnimeInfo(info) {
        const parent = document.querySelector(CONTAINER_SELECTOR);
        if (!parent) { log('Parent container not found'); return; }
        removePreviousAnimeInfoBox();
        hideConfiguredElements();
        const { box, summaryId } = createAnimeInfoBox(info);
        setupBlurEvents(summaryId);
        parent.appendChild(box);
        log('Appending anime info box', { html: box, parent: parent });
        lastDisplayNode = box;
    }

    // --- Hide Anime Info ---
    function hideAnimeInfo() {
        if (lastDisplayNode && lastDisplayNode.parentNode) {
            lastDisplayNode.remove();
            log('Removed displayed info');
            lastDisplayNode = null;
        }
        // Restore hidden elements
        for (const { el, prev } of hiddenElements) {
            el.style.display = prev;
            log('Restored element', el);
        }
        hiddenElements = [];
    }

    // --- Socket Event Hooks ---
    function setupSocketHooks() {
        if (typeof socket === 'undefined' || typeof Listener === 'undefined') { log('Socket or Listener not ready'); return; }
        log('Setting up socket hooks');

        // STORE: always store the anime ID, and if SHOW_ON_ANSWER_RESULTS, show info immediately
        socket.addListerner(EVENT_NAMES.STORE, new Listener(EVENT_NAMES.STORE, (data) => {
            setTimeout(() => {
                lastGamePhase = EVENT_NAMES.STORE;
                currentAnimeId = extractAnimeId(data);
                log('answer result event, currentAnimeId set to', currentAnimeId);
                if (getAlwaysOnMode() && currentAnimeId) {
                    (async () => {
                        let info = getFromCache(currentAnimeId);
                        if (!info) {
                            log('Cache miss for', currentAnimeId, '- fetching');
                            info = await fetchAnimeInfo(currentAnimeId);
                            if (info) setInCache(currentAnimeId, info);
                        } else {
                            log('Cache hit for', currentAnimeId);
                        }
                        if (info) showAnimeInfo(info);
                        else hideAnimeInfo();
                    })();
                }
            }, 99);
        }));

        // SHOW: only show info if SHOW_ON_ANSWER_RESULTS is false
        socket.addListerner(EVENT_NAMES.SHOW, new Listener(EVENT_NAMES.SHOW, async () => {
            lastGamePhase = EVENT_NAMES.SHOW;
            if (getAlwaysOnMode()) return;
            log('play next song event triggered');
            if (!currentAnimeId) { log('No currentAnimeId'); return; }
            let info = getFromCache(currentAnimeId);
            if (!info) {
                log('Cache miss for', currentAnimeId, '- fetching');
                info = await fetchAnimeInfo(currentAnimeId);
                if (info) setInCache(currentAnimeId, info);
            } else {
                log('Cache hit for', currentAnimeId);
            }
            setTimeout(() => {
                if (info) showAnimeInfo(info);
                else hideAnimeInfo();
            }, 101);
        }));

        // HIDE: always hide info
        socket.addListerner(EVENT_NAMES.HIDE, new Listener(EVENT_NAMES.HIDE, () => {
            setTimeout(() => {
                lastGamePhase = EVENT_NAMES.HIDE;
                log('guess phase over event triggered');
                hideAnimeInfo();
            }, 100)
        }));
    }

    // --- Setup Keybind Handler(s) ---
    function setupKeybindHandler() {
        document.addEventListener('keydown', function(e) {
            if (
                e.key.toUpperCase() === ALWAYS_ON_TOGGLE_KEYBIND.key.toUpperCase() &&
                !!e.shiftKey === !!ALWAYS_ON_TOGGLE_KEYBIND.shift &&
                !!e.ctrlKey === !!ALWAYS_ON_TOGGLE_KEYBIND.ctrl &&
                !!e.altKey === !!ALWAYS_ON_TOGGLE_KEYBIND.alt &&
                !e.repeat
            ) {
                e.preventDefault();
                const isAlwaysOn = !getAlwaysOnMode();
                setAlwaysOnMode(isAlwaysOn);
                log('AlwaysOn Mode toggled', isAlwaysOn ? 'ON' : 'OFF');
                showToggleNotification(isAlwaysOn);
                remedyAlwaysOnDisplay(isAlwaysOn);
            }
        });
    }

    // --- Wait for AMQ socket ---
    function waitForAMQ() {
        if (typeof socket !== 'undefined' && typeof Listener !== 'undefined') {
            log('AMQ ready');
            setupSocketHooks();
            setupKeybindHandler();
        } else {
            log('Waiting for AMQ...');
            setTimeout(waitForAMQ, 1000);
        }
    }
    waitForAMQ();
})();
