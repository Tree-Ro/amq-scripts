# Anime Summary Userscript

**Purpose:**  
Displays the round’s anime summary and cover from AniList.

**Behavior:**  
- Stores anime ID on the reveal of each rounds answer.  
- Fetches and caches anime info from anilist if not already cached.  
- Shows info box during `play next song` (The guessing phase) and is then hidden during `answer results`.

- AlwaysOn: Alternatively is not hidden during the `answer results` and is only replaced once new info is available. Best for ranked mode or when video is off (otherwise overlaps video).

- LRU Cache: By default, only the most recently used 800 entries are cached, which should take up about 1 MB of your 5 MB localStorage quota. This is configurable if you want to use less space or cache more, to be considerate of Anilist for providing such a nice API :)


There is a decent amount of config at the top of the script like disabling the blur etc.

**Installation:**  
1. Tampermonkey or Violentmonkey  
