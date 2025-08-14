# Anime Summary Userscript

**Purpose:**  
Displays the round’s anime summary and cover from AniList.

**Behavior:**  
- Stores anime ID on the reveal of each rounds answer.  
- Fetches and caches anime info from anilist if not already cached.  
- Shows info box during `play next song` (The guessing phase) and is then hidden during `answer results`.

- AlwaysOn: Alternatively is not hidden during the `answer results` and is only replaced once new info is available. Best for ranked mode or when video is off (otherwise overlaps video).

There is a decent amount of config at the top of the script like disabling the blur etc.

**Installation:**  
1. Tampermonkey or Violentmonkey  
