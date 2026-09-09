# SPECTER

A cinematic, visual-only cyber simulation with a full-viewport interactive Israel outline and six selectable company markers. Drag to pan, scroll or pinch to zoom, and use the bottom icon controls to zoom, fit the country, or enter fullscreen. Keyboard users can Tab to companies and controls; on the map, arrow keys pan, +/− zoom, and Home resets. Selecting a company opens “Attack Started” with “Look At The Screens” as its subtitle. The top close button or Escape returns to the map.

## Run

Requires Node.js 18 or later. No dependencies or installation needed.

```sh
npm start
```

Open http://localhost:3000. Set `PORT` to use a different port. The server binds only to the local computer.

```sh
npm run check
```

All effects are generated in the browser. No scanning, exploitation, real telemetry, external requests, or company integrations are implemented. Markers use approximate public company-campus locations, with limitations and references in [SOURCES.md](SOURCES.md). The custom outline merges the West Bank into the displayed extent at the user's request. Company names are used for the fictional demo; no affiliation is implied. Reduced-motion preferences are respected.

Rafael is highlighted with a larger illuminated label and an orbiting marker ring. Launching a simulation shifts the map right while the attack panel slides left-to-right from offscreen left and settles on the left. The timer, telemetry, event log, and footer controls have been removed. Closing reverses the motion without resetting pan or zoom. On narrow screens the attack panel fills the viewport; reduced-motion mode skips the slide and pulse effects.

Run `node --test tests/map.test.mjs` for geographic fitting, label-collision, and zoom-anchor checks. Browser interaction and optional WebMCP integration have not been verified in a browser.

The `dist` folder also works with any static web host. `server.mjs` is the Node.js server for local use.

Both screens have a local canvas particle network: green on the map and red on the attack panel. Nearby particles drift away from the pointer and form brighter connections. Touch movement also lights the network without intercepting map controls. Particle counts and pixel density are capped; animation pauses in hidden tabs. Reduced-motion mode keeps particles static with an immediate pointer glow.
