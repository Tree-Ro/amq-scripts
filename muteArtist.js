// ==UserScript==
// @name         Mute audio for X artists
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A script that automatically mutes the game during the result phase for artists added to your local list
// @author       Mooero
// @match        https://animemusicquiz.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://github.com/Minigamer42/scripts/raw/master/lib/commands.js
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let enabled = true;
  let songInfoHider = document.getElementById("qpInfoHider");

  if (document.getElementById("lpLoginBox")) return;

  if (JSON.parse(localStorage.getItem("mutedArtistList")) === null)
    localStorage.setItem("mutedArtistList", JSON.stringify([]));

  if (songInfoHider) {
    setup();
  }

  function setup() 
    volumeController.setMuted(false)
    volumeController.adjustVolume();
    
    new MutationObserver((mutationRecord, observer) => {
      if (enabled === false) return;
      let currentArtist = document.getElementById("qpSongArtist").textContent;

      if (getMutedArtistList().includes(currentArtist)) {
        volumeController.setMuted(false);
        volumeController.adjustVolume();
      }

      if (mutationRecord[0].target.classList.contains("hide")) {
        currentArtist = document.getElementById("qpSongArtist").textContent;

        if (getMutedArtistList().includes(currentArtist)) {
          volumeController.setMuted(true);
          volumeController.adjustVolume();
        }
      }
    }).observe(songInfoHider, { attributes: true });

    function getMutedArtistList() {
      const list = localStorage.getItem("mutedArtistList");
      return list ? JSON.parse(list) : [];
    }

    function addMutedArtist(artist) {
      const currentList = getMutedArtistList();

      if (currentList.includes(artist))
        return `${artist} already exists in the list of muted artists`;

      currentList.push(artist);

      localStorage.setItem("mutedArtistList", JSON.stringify(currentList));

      return `${artist} added to list of muted artists`;
    }

    function removeMutedArtist(artist) {
      const currentList = getMutedArtistList();

      if (!currentList.includes(artist))
        return `There is no artist with the name "${artist}" in the list`;

      const indexOfArtist = currentList.indexOf(artist);
      currentList.splice(indexOfArtist, 1);

      localStorage.setItem("mutedArtistList", JSON.stringify(currentList));
      return `"${artist}" removed from list`;
    }

    function writeToChat(messageString) {
      gameChat.systemMessage("MutedArtistScript:", messageString);
    }

    function toggleEnabled() {
      enabled = !enabled;
      return `mutedArtist script is now: ${enabled ? "ENABLED" : "DISABLED"}`;
    }

    AMQ_addCommand({
      command: "artist.toggle",
      callback: () => {
        writeToChat(toggleEnabled());
      },
      description:
        "Toggle the muting of audio during the result phase if the current artist is in the muted list",
    });
    AMQ_addCommand({
      command: "artist.add",
      callback: (...ArtistName) => {
        writeToChat(addMutedArtist(ArtistName.join(" ")));
      },
      description: `Add an artist to the muted list. Usage: /artist.add [ArtistName]`,
    });
    AMQ_addCommand({
      command: "artist.remove",
      callback: (...ArtistName) => {
        writeToChat(removeMutedArtist(ArtistName.join(" ")));
      },
      description: `Remove an artist from the muted list. Usage: /artist.remove [ArtistName]`,
    });
    AMQ_addCommand({
      command: "artist.list",
      callback: () => {
        writeToChat(JSON.stringify(getMutedArtistList()));
      },
      description: "Display the list of currently muted artists",
    });
  }
})();
