// ==UserScript==
// @name         Anime Summary
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A kinda customisable userscript querying anilist for summary + cover of the previous rounds anime and then display it during the next guessing phase. 
// @author       Mooero
// @match        https://animemusicquiz.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- User Config (safe to change) ---
    const TITLE_PREFERENCE = 'romaji';     // 'native', 'romaji', or 'english'
    const BLUR_SUMMARY = false;             // Set to true to blur summary (unblur on hover)
    const BLUR_AMOUNT = 3;                  // Amount of blur in px (e.g. 5 for 'blur(5px)')

    const LOG_ENABLED = false;              // Set to true to enable logging
    const ANILIST_API_LIMIT = 20;           // Shouldn't be an issue unless you spam vote skip instantly or play 1sec guess phases etc..
    // requests per minute https://docs.anilist.co/guide/rate-limiting.

    // My CSS skills are def supbar so this is a reminder that you can update the CSS styles below to customize the appearance of the anime info box.
    // Definitely expecting it to break on different screen sizes etc. 
    // --- End of User Config (safe to change) ---

    // --- Internal Constants (not recommended to change) ---
    const CACHE_KEY = 'AMQ_AnimeSummary';
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

    function log(msg, ...args) {
        if (LOG_ENABLED) console.log(`[AnimeSummary] ${msg}`, ...args);
    }

    // --- Cache ---
    function getCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
            log('Cache retrieved', cache);
            return cache;
        } catch (e) {
            log('Cache parse failed', e);
            return {};
        }
    }
    function setCache(cache) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        log('Cache updated', cache);
    }

    // --- Utility: Extract anime ID from #qpAnimeLink ---
    function extractAnimeId() {
        const link = document.querySelector('#qpAnimeLink');
        if (!link) { log('Anime link not found'); return null; }
        if (!link.href) { log('Anime link missing href'); return null; }
        const match = link.href.match(/anilist.co\/anime\/(\d+)/);
        const id = match ? match[1] : null;
        log('Extracted anime ID', id, 'from', link.href);
        return id;
    }

    // --- API: AniList GraphQL ---
    async function fetchAnimeInfo(id) {
        log('Fetching anime info for ID', id);
        const query = `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english native } coverImage { large } description(asHtml: false) } }`;
        const variables = { id: Number(id) };
        let attempts = 0;
        while (true) {
            const now = Date.now();
            if (now - lastApiReset > 60_000) { apiCount = 0; lastApiReset = now; }
            if (apiCount >= ANILIST_API_LIMIT) {
                const wait = 60_000 - (now - lastApiReset) + 1000;
                log('API limit reached, waiting', wait);
                await new Promise(res => setTimeout(res, wait));
                apiCount = 0; lastApiReset = Date.now();
            }
            apiCount++;
            try {
                const resp = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query, variables })
                });
                log('Fetch response', resp.status);
                if (resp.status === 429) {
                    const retry = resp.headers.get('Retry-After') || 2;
                    log('Rate limited, retrying in', retry, 'seconds');
                    await new Promise(res => setTimeout(res, Number(retry) * 1000));
                    attempts++;
                    if (attempts > 10) { log('Max retries exceeded'); return null; }
                    continue;
                }
                if (!resp.ok) { log('Fetch failed with status', resp.status); return null; }
                const data = await resp.json();
                log('Fetched anime data', data.data && data.data.Media);
                return data.data && data.data.Media ? data.data.Media : null;
            } catch (e) {
                log('Fetch error', e);
                return null;
            }
        }
    }

    // --- Display ---
    function showAnimeInfo(info) {
        const parent = document.querySelector('#qpVideoOverflowContainer');
        if (!parent) { log('Parent container not found'); return; }
        // Remove previous info box if present
        if (lastDisplayNode && lastDisplayNode.parentNode) {
            lastDisplayNode.remove();
            log('Removed previous display', lastDisplayNode);
        }
        // Hide configured elements and remember their previous display
        hiddenElements = [];
        for (const selector of HIDE_ON_INFO_SELECTORS) {
            document.querySelectorAll(selector).forEach(el => {
                hiddenElements.push({ el, prev: el.style.display });
                el.style.display = 'none';
                log('Hiding element', el);
            });
        }
        // Container
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.top = '50%';
        box.style.left = '50%';
        box.style.transform = 'translate(-50%, -50%)';
        box.style.display = 'flex';
        box.style.alignItems = 'flex-start';
        box.style.gap = '16px';
        box.style.color = '#fff';
        box.style.padding = '12px';
        box.style.borderRadius = '8px';
        box.style.margin = '8px 0';
        box.style.maxWidth = '600px';
        box.style.fontSize = '15px';
        box.style.zIndex = '2147483647'; // max z-index
        // Cover
        const img = document.createElement('img');
        img.src = info.coverImage?.large || '';
        img.alt = 'Cover';
        img.style.width = '140px';
        img.style.height = 'fit-content';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        // Text
    const text = document.createElement('div');
    let title = 'Unknown';
    if (TITLE_PREFERENCE === 'native') title = info.title?.native || info.title?.english || info.title?.romaji || 'ERROR: Unknown';
    else if (TITLE_PREFERENCE === 'romaji') title = info.title?.romaji || info.title?.english || info.title?.native || 'ERROR: Unknown';
    else title = info.title?.english || info.title?.romaji || info.title?.native || 'ERROR: Unknown';
    const summaryId = 'amqAnimeSummaryText';
    let summaryStyle = 'margin-top:6px;max-height:150px;min-width:385px;overflow:auto;';
    if (BLUR_SUMMARY) summaryStyle += `filter:blur(${BLUR_AMOUNT}px);transition:filter 0.2s;cursor:pointer;`;
    text.innerHTML = `<b style=\"font-size:1.1em;\">${title}</b><br><div id=\"${summaryId}\" style=\"${summaryStyle}\">${info.description || 'No summary available.'}</div>`;
    // If blur enabled, add hover event to unblur
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
        // Append
        box.appendChild(img);
        box.appendChild(text);
        parent.appendChild(box);
        log('Appending anime info box', { html: box, parent: '#qpVideoOverflowContainer' });
        lastDisplayNode = box;
    }

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

    socket.addListerner(EVENT_NAMES.STORE, new Listener(EVENT_NAMES.STORE, () => {
            setTimeout(() => {
                const id = extractAnimeId();
                currentAnimeId = id || null;
                log('answer result event, currentAnimeId set to', currentAnimeId);
            }, 99);
        }));

    socket.addListerner(EVENT_NAMES.SHOW, new Listener(EVENT_NAMES.SHOW, async () => {
            log('play next song event triggered');
            if (!currentAnimeId) { log('No currentAnimeId'); return; }
            let cache = getCache();
            let info = cache[currentAnimeId];
            if (info) log('Cache hit for', currentAnimeId);
            else { log('Cache miss for', currentAnimeId, '- fetching'); info = await fetchAnimeInfo(currentAnimeId); if (info) { cache[currentAnimeId] = info; setCache(cache); } }
            setTimeout(() => {
                if (info) showAnimeInfo(info);
                else hideAnimeInfo();
            }, 101);
        }));

    socket.addListerner(EVENT_NAMES.HIDE, new Listener(EVENT_NAMES.HIDE, () => {
        setTimeout(() => {
            log('guess phase over event triggered');
            hideAnimeInfo();
        }, 100)
        }));
    }

    // --- Wait for AMQ socket ---
    function waitForAMQ() {
        if (typeof socket !== 'undefined' && typeof Listener !== 'undefined') { log('AMQ ready'); setupSocketHooks(); }
        else { log('Waiting for AMQ...'); setTimeout(waitForAMQ, 1000); }
    }
    waitForAMQ();
})();
