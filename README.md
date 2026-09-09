# SPECTER

A cinematic, visual-only cyber simulation with a full-viewport interactive Israel outline and six selectable company markers. Drag to pan, scroll or pinch to zoom, and use the bottom icon controls to zoom, fit the country, or enter fullscreen. Keyboard users can Tab to companies and controls; on the map, arrow keys pan, +/− zoom, and Home resets. Selecting a company opens “Attack Started - Look At The Screens” with animated synthetic telemetry. Escape or End Simulation returns to the map.

## Run

Requires Node.js 18 or later. No dependencies or installation needed.

```sh
npm start
```

Open http://localhost:3000. Set `PORT` to use a different port. The server binds only to the local computer.

```sh
npm run check
```

All effects are generated in the browser. No scanning, exploitation, real telemetry, external requests, or company integrations are implemented. Markers use approximate public company-campus locations, with limitations and references in [SOURCES.md](SOURCES.md). The Natural Earth geographic outline retains the source's boundary conventions. Company names are used for the fictional demo; no affiliation is implied. Reduced-motion preferences are respected.

Run `node --test tests/map.test.mjs` for geographic fitting, label-collision, and zoom-anchor checks. Browser interaction and optional WebMCP integration have not been verified in a browser.

The `dist` folder also works with any static web host. `server.mjs` is the Node.js server for local use.
