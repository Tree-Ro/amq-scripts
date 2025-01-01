// ==UserScript==
// @name         setContainerHeightToAnother
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Set one element's max height relative to another element's max height during a game, default is to set the song info container to the height of the center container minus the title text above.
// @author       Mooero
// @match        https://*.animemusicquiz.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const config = {
        // CSS selector to use as a reference to the max height
        referenceContainer: '#qpAnimeCenterContainer',

        // Optional CSS selector: In case you want to exclude something from within the reference container you can include it here
        // Leave empty '' if you dont want to subtract anything
        subtractContainer: '#qpCenterInfoContainer',

        // CSS selector to target the element whose height will me limited
        targetSelector: '#qpSongInfoContainer',
    };

    // Functionality below

    function updateMaxHeight() {
        const reference = document.querySelector(config.referenceContainer);
        const subtract = document.querySelector(config.subtractContainer);
        const target = document.querySelector(config.targetSelector);

        if (reference && target) {
            const refHeight = reference.offsetHeight;
            const subtractHeight = subtract.offsetHeight || 0;

            // Sets the targets maxheight relative to reference
            target.style.maxHeight = `${refHeight - subtractHeight}px`;

            // Make sure the target doesn't overflow
            target.style.overflow = 'auto';
        } else {
            console.warn('Provided reference and or target selector is invalid')
        }
    }

    // Update on window resize
    window.addEventListener('resize', updateMaxHeight);

    // Init kinda?
    socket.addListerner("answer results", new Listener("answer results", updateMaxHeight))
})();
