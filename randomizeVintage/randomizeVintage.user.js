// ==UserScript==
// @name         randomizeVintage
// @namespace    http://tampermonkey.net/
// @version      2024-11-11
// @description  Randomizes the vintage setting in AMQ based on a specified interval, triggered after each quiz ends or when hosting a new quiz.
// @author       Mooero
// @match        https://*.animemusicquiz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com/
// @require      https://github.com/Minigamer42/scripts/raw/master/lib/commands.js
// @downloadURL  https://github.com/Tree-Ro/amq-scripts/raw/main/randomizeVintage/randomizeVintage.user.js
// @updateURL    https://github.com/Tree-Ro/amq-scripts/raw/main/randomizeVintage/randomizeVintage.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  // ------------------- Configuration -------------------

  // Command used in AMQ chat to toggle the script's functionality
  const TOGGLE_SCRIPT_COMMAND = 'RVtoggle'

  // Command used to adjust the interval size for the vintage randomization
  const INTERVAL_SIZE_COMMAND = 'RVinterval'

  // Maximum allowed interval size for vintage years (e.g., max span of years)
  const MAX_INTERVAL_SIZE = 50

  // ---------- The following section should not require modification ----------

  // List of AMQ events that trigger an attempt to update to the vintage/year setting
  const COMMANDS_TO_TRIGGER_ON = ['Host Game', 'quiz over']

  // Key used to store user settings in localStorage
  const OPTIONS_KEY = 'RVOptions'

  // ------------------- Script Start -------------------

  // Skip initialization if user is on the login page
  if (document.getElementById('lpLoginBox')) return;

  // Initialize settings in localStorage if they don't exist
  if (!localStorage.getItem(OPTIONS_KEY)) {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify({
      isEnabled: false,       // Default state: script is disabled
      intervalSize: 5,        // Default interval size: 5 years
    }))
  };

  function init() {
    // Set up event listeners for the relevant game commands
    for (const command of COMMANDS_TO_TRIGGER_ON) {
      socket.addListerner(command, new Listener(command, updateGameYearInterval))
    }
  }

  // Function to randomize the vintage setting based on the current interval
  function updateGameYearInterval() {
    const { isEnabled } = loadOptions()
    if (!isEnabled) return;

    const randomInterval = getRandomYearInterval()

    socket.sendCommand({
      "type": "lobby",
      "command": "change game settings",
      "data": {
        "vintage": {
          "standardValue": {
            "years": randomInterval,
            "seasons": [
              0,
              3
            ]
          },
          "advancedValueList": []
        }
      }
    })
  }

  // Function to generate a random interval within the specified range
  function getRandomYearInterval() {
    const { intervalSize } = loadOptions()
    const startYear = 1960;
    const currentYear = new Date().getFullYear();

    // Calculate a random starting year and an ending year based on the interval size
    const intervalStart = Math.floor(Math.random() * (currentYear - startYear + 1)) + startYear;
    const intervalEnd = intervalStart + +intervalSize;

    return [intervalStart, intervalEnd]
  }

  // Helper function to load user settings from localStorage
  function loadOptions() {
    return JSON.parse(localStorage.getItem(OPTIONS_KEY)) || {};
  }

  // Helper function to save updated settings to localStorage
  function saveOptions(options) {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
    gameChat.systemMessage(`Settings Updated: [ Size: ${options.intervalSize} | Enabled: ${options.isEnabled} ]`);
  }

  // Function to update the interval size, ensuring it's a valid number within limits
  function updateIntervalSize(newSize) {
    const number = parseInt(newSize);
    if (isNaN(number)) {
      gameChat.systemMessage('Please provide a valid number for the interval size.');
      return;
    }
    if (number > MAX_INTERVAL_SIZE) {
      gameChat.systemMessage(`Interval Size is too large. Please choose a number smaller than ${MAX_INTERVAL_SIZE}.`)
      return;
    }
    if (number <= 0) {
      gameChat.systemMessage('Interval size must be greater than 0.');
      return;
    }

    const options = loadOptions();
    options['intervalSize'] = newSize;
    saveOptions(options);
  }

  // Function to toggle the script's enabled state
  function toggleScript() {
    const options = loadOptions();
    options['isEnabled'] = !options['isEnabled'];
    saveOptions(options);
  }

  // Register custom commands in AMQ
  AMQ_addCommand({
    command: TOGGLE_SCRIPT_COMMAND,
    callback: toggleScript,
    description: "Toggles the Randomize Vintage script on or off."
  })
  AMQ_addCommand({
    command: INTERVAL_SIZE_COMMAND,
    callback: updateIntervalSize,
    description: "Adjusts the interval size for the random vintage year range."
  })

  // Initialize event listeners for relevant game events
  init()
})();
