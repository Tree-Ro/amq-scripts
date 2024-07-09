# Commands Documentation for AMQ Extension

This document outlines the available commands provided by the AMQ extension, along with their descriptions and usage.

## Commands

### /AMaddSong
Adds the current song to the list of muted songs.

### /AMremoveSong
Removes the current song from the list of muted songs.

### /AMaddArtist <Artist Name>
Adds a specific artist to the list of artists to autoMute.

### /AMremoveArtist <Artist Name> 
Removes a specific artist from the list of artists to autoMute.

### /AMtoggle <Option>
Toggles the selected option. See `/AMinfo options` for which options that are available.

### AMinfo <Info To Show>
Displays one of three options that the script stores locally: `["songs", "artists", "options"]`.
'songs' refers to the current list of muted songs.
'artists' refers to the current list of muted artists.
'options' returns all the options that are available and their current status. 

## Usage Examples
- ex. **/AMaddArtist TK from Ling Tosite Sigure** 
- Note that the artist name is case sensitive so I would recommend copy pasting the text that is in the "Song Info" box. 

- ex. **/AMremoveArtist TK from Ling Tosite Sigure**
- Note that the artist name is case sensitive so I would recommend copy pasting the text that is in the "Song Info" box. 


### ex. /AMtoggle scriptEnabled
Toggle various options within the extension. Use `/AMinfo options` to see a list of available options that can be toggled.

#### Current Options and Defaults:
- **scriptEnabled**: `true`
  - Enables or disables all functionalities of the script.

- **muteOnSong**: `true`
  - Automatically mutes the song only if its name matches a muted song (case sensitive).

- **muteOnArtist**: `true`
  - Automatically mutes the song only if its artist matches a muted artist (case sensitive).

- **muteOnExactMatch**: `false`
  - Mutes the song only if both the song name and artist match a muted entry/song (case sensitive).

- **quickAddSongs**: `false`
  - Enhances functionality of the "thumbs up" and "thumbs down" buttons in the info panel. Automatically runs `/AMaddSong` for thumbs up and `/AMremoveSong` for thumbs down.
  - Do note that according to the announcements section in the Discord it is possible that there will be new functionality added to the thumbs buttons so I dont know how that will change how the script works.

- ex. **/AMinfo options**: Use this command to display stored data related to songs, artists, or options.
