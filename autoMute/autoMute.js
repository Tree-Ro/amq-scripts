// ==UserScript==
// @name         Amq AutoMute
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A script that automatically mutes the game during the result phase for artists and songs added to your local list
// @author       Mooero
// @match        https://animemusicquiz.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://github.com/Minigamer42/scripts/raw/master/lib/commands.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let songInfoHider = document.getElementById('qpInfoHider');

  if (document.getElementById('lpLoginBox')) return;

  if (JSON.parse(localStorage.getItem('autoMuteList')) === null) {
    localStorage.setItem(
      'autoMuteList',
      JSON.stringify({
        mutedArtists: {},
        mutedSongs: {},
        options: {
          scriptEnabled: true,
          muteOnSong: true,
          muteOnArtist: true,
          muteOnExactMatch: false,
          quickAddSongs: false,
        },
      })
    );
  }

  if (songInfoHider) {
    setup();
  }

  function setup() {
    volumeController.setMuted(false);
    volumeController.adjustVolume();
    let scriptMutedLastSong = null;

    new MutationObserver((mutationRecord, observer) => {
      const options = getStoredData().options;

      controlThumbListeners();
      if (!options.scriptEnabled) return;

      if (scriptMutedLastSong) {
        //Unmutes any songs/artists in the lists on start of new "round" assuming the script muted them.
        volumeController.setMuted(false);
        volumeController.adjustVolume();
        scriptMutedLastSong = false;
      }

      if (mutationRecord[0].target.classList.contains('hide')) {
        let currentArtist = document.getElementById('qpSongArtist').textContent;
        let currentSong = document.getElementById('qpSongName').textContent;

        if (shouldMute(currentArtist, currentSong)) {
          volumeController.setMuted(true);
          volumeController.adjustVolume();
          scriptMutedLastSong = true;
        }
      }
    }).observe(songInfoHider, { attributes: true });
  }

  function shouldMute(artistName, songName) {
    const data = getStoredData();
    const options = data.options;

    if (options.muteOnSong && getMutedSongNames().includes(songName)) {
      return true;
    }
    if (options.muteOnArtist && getMutedArtists().includes(artistName)) {
      return true;
    }
    if (
      options.muteOnExactMatch &&
      getMutedIds().includes(createHash(songName + artistName))
    ) {
      return true;
    }
    return false;
  }

  function controlThumbListeners() {
    const options = getStoredData().options;
    const thumbsDownBtn = document.querySelector('#qpDownvoteContainer');
    const thumbsUpBtn = document.querySelector('#qpUpvoteContainer');

    thumbsDownBtn.removeEventListener('click', addSongToMuteList);
    thumbsUpBtn.removeEventListener('click', removeSongFromMuteList);

    if (options.quickAddSongs) {
      thumbsDownBtn.addEventListener('click', addSongToMuteList);
      thumbsUpBtn.addEventListener('click', removeSongFromMuteList);
    }
  }

  function createHash(string) {
    let hash = 0;
    if (string.length === 0) return hash;

    for (let i = 0; i < string.length; i++) {
      const char = string.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  function getStoredData() {
    return JSON.parse(localStorage.getItem('autoMuteList'));
  }

  function getMutedArtists() {
    const data = getStoredData();

    if (!data || !data.mutedArtists) {
      return [];
    }

    return Object.keys(data.mutedArtists);
  }

  function getMutedSongNames() {
    const data = getStoredData();

    if (!data || !data.mutedSongs) {
      return [];
    }

    const songObjects = data.mutedSongs;
    const songNames = Object.values(songObjects).map((song) => song.name);

    return songNames;
  }

  function getMutedIds() {
    const data = getStoredData();

    if (!data || !data.mutedSongs) {
      return [];
    }

    const mutedSongs = data.mutedSongs;
    return Object.keys(mutedSongs);
  }

  function addArtistToMuteList(...artistName) {
    artistName = artistName.length > 1 ? artistName.join(' ') : artistName[0];

    const data = getStoredData();
    if (!data.mutedArtists[artistName]) {
      data.mutedArtists[artistName] = {};
      localStorage.setItem('autoMuteList', JSON.stringify(data));
      writeToChat(`Added artist to mute list: ${artistName}`);
    } else {
      writeToChat(`Artist already in mute list: ${artistName}`);
    }
  }

  function removeArtistFromMuteList(...artistName) {
    artistName = artistName.length > 1 ? artistName.join(' ') : artistName[0];

    const data = getStoredData();
    if (data.mutedArtists[artistName]) {
      delete data.mutedArtists[artistName];
      localStorage.setItem('autoMuteList', JSON.stringify(data));
      writeToChat(`Removed artist from mute list: ${artistName}`);
    } else {
      writeToChat(`Artist not found in mute list: ${artistName}`);
    }
  }

  function listMutedArtists() {
    const mutedArtists = getMutedArtists();
    writeToChat(`Muted artists: ${mutedArtists}`);
  }

  function addSongToMuteList() {
    if (!document.getElementById('qpInfoHider').classList.contains('hide')) {
      writeToChat(
        'This command is only available once the Song Info is shown to the user (Result Phase)'
      );
      return;
    } else {
      const songName = document.getElementById('qpSongName').textContent;
      const artistName = document.getElementById('qpSongArtist').textContent;
      const data = getStoredData();
      const id = createHash(songName + artistName);

      if (!data.mutedSongs[id]) {
        data.mutedSongs[id] = {
          name: songName,
          artist: artistName,
        };
        localStorage.setItem('autoMuteList', JSON.stringify(data));
        writeToChat(`Added song to mute list: ${songName}`);
      } else {
        writeToChat(`Song already in mute list: ${songName}`);
      }
    }
  }

  function removeSongFromMuteList() {
    if (!document.getElementById('qpInfoHider').classList.contains('hide')) {
      writeToChat(
        'This command is only available once the Song Info is shown to the user (Result Phase)'
      );
      return;
    } else {
      const songName = document.getElementById('qpSongName').textContent;
      const artistName = document.getElementById('qpSongArtist').textContent;
      const data = getStoredData();
      const id = createHash(songName + artistName);

      if (data.mutedSongs[id]) {
        delete data.mutedSongs[id];
        localStorage.setItem('autoMuteList', JSON.stringify(data));
        writeToChat(`Deleted song from mute list: ${songName}`);
      } else {
        writeToChat(`Song not found in mute list: ${songName}`);
      }
    }
  }

  function listMutedSongs() {
    const mutedSongs = getMutedSongNames();
    writeToChat(`Muted songs: ${mutedSongs}`);
  }

  function listOptions() {
    const options = getStoredData().options;

    writeToChat('Options:');
    for (let option in options) {
      gameChat.systemMessage(`${option}: ${options[option]}`);
    }
  }

  function writeToChat(messageString) {
    gameChat.systemMessage('AutoMuteScript:', messageString);
  }

  function listStoredData(itemToList) {
    itemToList = itemToList ? itemToList.toLowerCase() : null;

    switch (itemToList) {
      case 'songs':
        listMutedSongs();
        break;
      case 'artists':
        listMutedArtists();
        break;
      case 'options':
        listOptions();
        break;
      default:
        writeToChat(
          'Use this command with one of the following options: ["songs", "artists", "options"]'
        );
    }
  }

  function toggleOption(option) {
    const data = getStoredData();
    if (Object.keys(data.options).includes(option)) {
      data.options[option] = !data.options[option];
      localStorage.setItem('autoMuteList', JSON.stringify(data));
      writeToChat(
        `The option ${option} has now been set to: ${data.options[option]}`
      );
    } else {
      writeToChat(
        `Could not find "${option}", please check that you've spelled it correctly`
      );
    }
  }

  AMQ_addCommand({
    command: 'AMaddSong',
    callback: addSongToMuteList,
    description: 'Adds the current song to the list of muted songs',
  });
  AMQ_addCommand({
    command: 'AMremoveSong',
    callback: removeSongFromMuteList,
    description: 'Removes the current song from the list of muted songs',
  });
  AMQ_addCommand({
    command: 'AMaddArtist',
    callback: (...artistName) => addArtistToMuteList(...artistName),
    description: 'Adds a specific artist to the list of artists to autoMute',
  });
  AMQ_addCommand({
    command: 'AMremoveArtist',
    callback: (...artistName) => removeArtistFromMuteList(...artistName),
    description:
      'Removes a specific artist from the list of artists to autoMute',
  });
  AMQ_addCommand({
    command: 'AMtoggle',
    callback: toggleOption,
    description:
      'Toggles the selected option. See /AMinfo options for which options that are available.',
  });
  AMQ_addCommand({
    command: 'AMinfo',
    callback: listStoredData,
    description:
      'Displays one of three options: ["songs", "artists", "options"].',
  });
})();
