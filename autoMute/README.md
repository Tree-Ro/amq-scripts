## Commands Documentation for AMQ script

### Commands

- **/AMaddSong**
  - Adds the current song to the muted songs list.

- **/AMremoveSong**
  - Removes the current song from the muted songs list.

- **/AMaddArtist <Artist Name>**
  - Adds a specific artist to the autoMute list.

- **/AMremoveArtist <Artist Name>**
  - Removes a specific artist from the autoMute list.

- **/AMtoggle <Option>**
  - Toggles the selected `option`.
- **Options & Defaults**
  - **scriptEnabled**: `true` (Enables or disables all functionalities)
  - **muteOnSong**: `true` (Mutes song if its name matches a muted song)
  - **muteOnArtist**: `true` (Mutes song if its artist matches a muted artist)
  - **muteOnExactMatch**: `false` (Mutes song if both name and artist match)
  - **quickAddSongs**: `false` (Auto Adds/Removes the current song from the song list when pressing "thumbs up" and "thumbs down" respectively)


- **/AMinfo <Info To Show>**
  - Displays stored information:
    - `songs`: Current list of muted songs.
    - `artists`: Current list of muted artists.
    - `options`: Current status of all script options.

### Usage Examples

- `/AMaddArtist TK from Ling Tosite Sigure`
  - Adds "TK from Ling Tosite Sigure" to autoMute artists.

- `/AMremoveArtist TK from Ling Tosite Sigure`
  - Removes "TK from Ling Tosite Sigure" from autoMute artists.

- `/AMtoggle scriptEnabled`
  - Toggles the `scriptEnabled` option.
