# Modify Loading Screen

This script modifies the loading screen of **Anime Music Quiz (AMQ)**. It can either remove the loading screen or replace its background with a custom image. 
Currently, the script isn't working very well and instead is only reducing the duration of the loading screen, but feel free to improve it yourself or make a pr.

## Configuration
- **REMOVE_LOADING_SCREEN_COMPLETELY**: Set to `true` to remove the loading screen entirely from the page. Set to `false` to keep it.
- **URL_LOADING_SCREEN_BACKGROUND**: Provide a URL to replace the loading screen's background. Set to `null` to keep the default background.
- **RETRY_DELAY_MS**: Delay in milliseconds to retry detecting the loading screen if it isn't found initially.

## Usage
1. Install the script using Tampermonkey.
2. Visit [AMQ](https://animemusicquiz.com/).
