// ==UserScript==
// @name         Mute sound after X
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Winning over superHacker
// @author       Mooero
// @match        https://animemusicquiz.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://github.com/Minigamer42/scripts/raw/master/lib/commands.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

let time = -1;
let answerInput = document.getElementById("qpAnswerInput");

if (document.getElementById("lpLoginBox")) return;

if (answerInput) {
  setup();
}

function setup() {
  new MutationObserver((mutationRecord, observer) => {

    if (time == -1) return;

    volumeController.setMuted(false);
    volumeController.adjustVolume();

    if (mutationRecord[0].target.hasAttribute("disabled")) return;

    setTimeout(() => {
      volumeController.setMuted(true);
      volumeController.adjustVolume();
    }, time * 1000);
  }).observe(answerInput, { attributes: true });

  function muteSoundConfig(newTime) {
    time = newTime;
  }

  AMQ_addCommand({
    command: "ms",
    callback: muteSoundConfig,
    description: "Mute sound after x seconds in guessing phase, set <newTime> to -1 to disable",
  });
}

})();
