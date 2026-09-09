# SPECTER

A cinematic, visual-only cyber simulation with a schematic Israel map and six selectable defense companies. Selecting an entity opens “Attack Started - Look At The Screens” with animated synthetic telemetry. Escape or End Simulation returns to the map.

## Run

Requires Node.js 18 or later. No dependencies or installation needed.

```sh
npm start
```

Open http://localhost:3000. Set `PORT` to use a different port. The server binds only to the local computer.

```sh
npm run check
```

All effects are generated in the browser. No scanning, exploitation, real telemetry, external requests, or company integrations are implemented. Company markers are illustrative placements, not facility locations. Geography is schematic, not an authoritative boundary map. Company names are used for the fictional demo; no affiliation is implied. Reduced-motion preferences are respected.

The `dist` folder also works with any static web host. `server.mjs` is the Node.js server for local use.
