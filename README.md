# Night Atlas — PC edition

A local browser application for planning a stargazing session. This package includes a prebuilt app, a Node.js server requiring no npm packages at runtime, a Windows launcher, and editable source.

Read **START-HERE.txt** for setup. For Gemma, run **Setup-Gemma.bat**, replace the placeholder in `.env` with your key, save, and restart the server. Existing server environment variables take precedence over `.env`. Requires Node.js 22+. Start with `node server.cjs --open`, or double-click `Start-Night-Atlas.bat` on Windows. No package installation or build is needed to use the prebuilt app.

## Local and online features

The chart, catalog and astronomical calculations run locally and can work offline. Chat calls the open-weight **Gemma** model hosted by Google (`gemma-4-26b-a4b-it`), not a locally installed model. Internet access, a Google AI Studio key and provider quota are needed for chat. The local server recalculates observing context and sends that context and questions to Gemma. The backend loads GEMMA_API_KEY from the local .env file (or an existing server environment variable). The browser never receives this key and never sends a key in chat requests. The server supplies it in the x-goog-api-key header to Google. It is not logged. The .env file is outside the static asset allowlist and excluded from Git. Provider processing terms still apply.

The server binds only to 127.0.0.1, validates browser origin and host for chat requests, and serves a fixed asset allowlist. It does not expose your filesystem or publish the app to the internet. This is a local personal-use package, not a public production server.

## Development

`npm install` installs build dependencies. `npm run build` rebuilds the bundled client and chat route. `npm start` starts the local app. `src/page.tsx` is the React interface; `src/sky.ts` calculates positions; `src/chat.ts` calls Gemma. `server.cjs` is the local HTTP adapter; `build.mjs` creates the prebuilt assets.

## Accuracy and scope

Solar-system positions use Astronomy Engine. The magnitude-limited HYG star subset is precessed from J2000 to the selected date; stellar proper motion is not propagated. The map is for educational observing plans, not precision telescope pointing. East is left because the chart depicts the sky looking upward. Above-horizon positions do not guarantee visibility. There is no weather, terrain, light-pollution or satellite feed. UTC offsets are explicit; users must adjust for daylight saving where applicable. Pakistan presets use UTC+5. Darkness is searched from local noon to the next noon; polar locations may have no event. Never point eyes or optical equipment at the Sun using this app.

## Licensing and attribution

Original application code: MIT, see LICENSE.

Bundled React and React DOM are MIT, Lucide icons are ISC (see included license), and Astronomy Engine by Don Cross is MIT. Their licenses are included under licenses/ and legal comments accompany bundles.

`src/stars.json` and its bundled representation are a filtered and reduced-field adaptation of HYG Database v4.1 by David Nash / Astronomy Nexus, licensed CC BY-SA 4.0; this data is excluded from the app's MIT license. The source retains ID, name, right ascension, declination and magnitude for stars brighter than magnitude 4.5. See licenses/STARS-LICENSE.md and https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/hygdata_v41.csv . Attribution also appears in the app.

Gemma weights are not redistributed. The provider's model and service terms apply. Official API documentation: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api .

## Hackathon

The original contribution combines deterministic astronomical calculations with a Gemma observing guide. For submission to a challenge requiring public GitHub, publish this source and licenses in a public repository. This ZIP is not itself a public GitHub publication. Do not commit API keys.
