// ==UserScript==
// @name         Modify Loading Screen
// @namespace    http://tampermonkey.net/
// @version      2024-12-01
// @description  Removes or replaces the current loading screen of AMQ, currently not doing it very well... 
// @author       Mooero
// @match        https://*.animemusicquiz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// @downloadURL  https://github.com/Tree-Ro/amq-scripts/raw/main/modifyLoadingScreen/modifyLoadingScreen.user.js
// @updateURL    https://github.com/Tree-Ro/amq-scripts/raw/main/modifyLoadingScreen/modifyLoadingScreen.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ------------------- Configuration -------------------
  
  // Should be true or false depending on if you want to remove or keep the loading screen.
  const REMOVE_LOADING_SCREEN_COMPLETELY = true;

  // Should be null if you dont want to replace the loading screen otherwise a valid url.
  const URL_LOADING_SCREEN_BACKGROUND = null;

  // Can be lowered if you experience the loading screen flashing before removed/modified.
  // Honestly probably does not make a difference... 
  const RETRY_DELAY_MS = 10;

  // ------------------- Script Content -------------------
  const handleLoadingScreen = (loadingScreen) => {
    if (REMOVE_LOADING_SCREEN_COMPLETELY) return loadingScreen.remove();

    if (!URL_LOADING_SCREEN_BACKGROUND) return;

    const img = loadingScreen.querySelector('img');

    if (!img) return;

    const isUrl = URL_LOADING_SCREEN_BACKGROUND.match(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/i)

    if (!isUrl) {
      console.log(`${URL_LOADING_SCREEN_BACKGROUND} is not a proper url, loading screen did not get replaced`)
      return;
    }

    img.src = URL_LOADING_SCREEN_BACKGROUND;
    img.srcset = URL_LOADING_SCREEN_BACKGROUND;
  };


  const observeLoadingScreen = () => {
    const observer = new MutationObserver(() => {
      const loadingScreen = document.querySelector('#loadingScreen');
      if (!loadingScreen) return

      handleLoadingScreen(loadingScreen);
      observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  const init = () => {
    if (document.body) {
      observeLoadingScreen();
    } else {
      setTimeout(init, RETRY_DELAY_MS);
    }
  };

  // ------------------- Initialization -------------------
  init();
})();
