# SPECTER — Three-era exhibition console

A local, silent, fictional cyber exhibition experience for the participant workstation. The visitor selects one Iranian company on the regional map and plays an attack-vector puzzle followed by Hacker Typer in three scenarios. The physical Human/AI exhibition displays are not connected yet.

## Run

Requires Node.js 18 or later; no runtime dependencies.

```sh
npm start
```

Open http://localhost:3000. The server binds to this computer only. `PORT` changes the port.

```sh
npm run check
node --test tests/*.test.mjs
```

## Visitor journey

- The site opens with Space To Start above a blurred blue globe facing the Pacific side. Target selection and map controls are locked. Space (or the start button for touch) begins a 4.2-second, gently eased rotation toward Israel and Iran, followed by a 2.8-second zoom into the same regional view as the center button. The timer screen fades in over the final 0.9 seconds of the zoom, holding at 2026 until arrival. The globe and interface stay blue throughout the camera travel, then smoothly shift to faded sepia during the 1.8-second rewind timer. The color transition finishes with the rewind to 2020, when target selection opens at the regional zoom level.
- Selecting a company triggers a 5.6-second camera sequence: the globe dives toward the city, blends into a 3D district, and approaches the concept HQ. The view stays full screen for one second after arrival while the camera gently orbits the HQ, then continues that orbit as it docks beside the choices. Phishing, Black Box, and Zero-Day choices appear on the left; selecting one immediately starts its own first game. Back to map permits a different target before starting the first mode.
- **Phishing / Message Lab:** choose a subject, message, and call to action for a fictional schedule-update scenario. A live preview shows the assembled message. Test it, then revise any section that does not fit the brief.
- **Black Box / Recon:** inspect a replica website’s Home, Help, and Status pages. Collect three distinct clues about its software, shared version, and exposed preview environment, then select and test the entry point that connects them.
- **Zero-Day / Exploit Lab:** add four fictional code blocks to an editor in dependency order, then run a simulated test. Undo and retry if a line uses a value before it exists. Code is displayed and validated as authored block IDs; it is never executed.
- After the first game in each era, a follow-up question matches the selected approach. Phishing offers Phone Call, SMS, or Work Mail. Black Box offers the main company website, an internal organization website, or a customer support portal. Zero-Day offers cPanel (Hosting Server), Exchange (Mail Server), or FortiGate (Firewall). Selecting an option starts the second game, Hacker Typer, with the selected path visible beside the terminal.
- **2020 / Before AI:** warm sepia CRT treatment with muted copper accents, cream text, and dark brown panels across the globe, headquarters, and game screens. Company logos retain their original colors on the map and beside the HQ. The first puzzle allows revisions until solved. Hacker Typer completes with 48 printable keystrokes or 12 Type-button presses. No failure timer.
- **2026 / Defender AI:** electric blue with red interception effects. The vector puzzle and Hacker Typer are both blocked, each 10 seconds after its first interaction. A correct puzzle solution still receives a defensive response. The follow-up question appears between them.
- **2026 / Attacker + Defender AI:** cyan/violet effects. One initiating action per game starts an automatic three-second completion.
- Each game outcome holds for 1.2 seconds. Round results explain the outcome in one sentence; Space or Continue plays the next era transition, then asks for a fresh attack vector before the next pair of games can start. Final Space returns to the blurred Space To Start screen.

One target remains fixed during a run. Each era requires a new attack-vector choice and its matching follow-up choice; choices from the previous era are cleared. Refresh and restart clear the target, approach, follow-up choice, and progress. The minigames are authored visual simulations, not real exploit code or authentication systems.

## Controls and accessibility

Drag the globe, including from a logo, to rotate it. Scroll/pinch to zoom. Keyboard controls: arrows rotate, +/- zoom, Home restores the globe overview. The target-focus control zooms into the company region. Clicking a logo only selects it during the opening company-selection phase. Keyboard and touch equivalents are available for all games.

Space starts the opening rotation, advances result screens, does not skip globe or timeline transitions, and counts as normal typing inside Hacker Typer. Held-key repeats and modified browser shortcuts do not advance the typing game. Follow-up choices use native buttons supporting mouse, touch, Tab, Enter, and Space. Each new screen focuses its heading; animated code is decorative, while outcomes are announced.

Restart asks before clearing a run. During an active session, after 90 seconds without input, a ten-second warning appears; interaction dismisses it, otherwise the console resets. Game and idle clocks pause while the page is hidden. Reduced motion keeps the start gate and all choices, skips globe/timeline/HQ travel, and disables visual motion without skipping games. The opening screen can idle indefinitely; active target selection follows the normal idle reset.

## Map and exhibition

Iran is red, Israel blue, and surrounding regional countries yellow in every era, including 2020. The 2020 mode gives the landscape and interface a faded sepia tone while preserving these border colors. All countries and company markers use one spherical projection and camera. The opening view faces the opposite side of the globe. After Space and the rewind, the target-selection view centers on the Middle East, with Israel near the center and all of Iran visible. Company logos remain small; animated lines connect an illustrative Israel source to the Iranian company markers. Geography, logo provenance, and approximate city-level locations are documented in SOURCES.md.

The source exhibition layout is exhibition.glb: an 8 × 5 m space containing the participant console, separate Human/AI stations, overview TVs, and a presentation display. This project implements the visitor console only.

The dist directory also works on a static web host. All assets are bundled locally, there is no database, telemetry, audio, or outgoing network activity. The existing WebMCP target-selection tool is restricted to the opening company-selection phase.

## Validation

Automated tests cover the start gate, ordered globe/rewind/target flow, smooth camera endpoints, fresh attack vectors in each era, the complete win/loss/win sequence, all nine follow-up paths, all three first-game puzzles, wrong-answer revision, clue uniqueness, code dependency order, automatic AI assembly, Hacker Typer, phase guards, restart, idle expiry/dismissal, hidden-page timing, reduced motion, keyboard routing, map fitting, logo dragging, and particle lifecycle. Browser visual QA has not been performed for this update.

Defender-mode typing advances more slowly with continuous resistance instead of an 82% hard stop. Status messages explain the slowdown and detection before the block. Each blocked game gives one second of fading red impact and a decaying shake, then returns to the normal palette. Reduced motion omits the shake and tint.

Timeline transitions now use a fast rolling year reel: the years travel in roughly 650 ms, settle with a short glow effect, and advance after 1.8 seconds total. The final transition keeps the year at 2026 while upgrading the visual treatment.

HQ models are procedural, company-branded architectural illustrations, not reconstructions of actual facilities. Rendering uses bundled WebGL code with no dependencies; a fallback keeps approach choices available if WebGL is unavailable. Reduced motion skips the map approach and shows a static building.

The globe preserves detailed NASA Blue Marble satellite imagery in blue and cyan, with dark navy oceans, warm city lights, and raised connection arcs. Terrain is no longer averaged into flat triangles. A 4K global surface is joined by a 2048-square regional texture covering 25–70 degrees east and 18–48 degrees north, cropped from NASA's 21600 x 10800 July image. This gives the Israel–Iran view four times the longitudinal texture density of the global surface. The regional texture loads once the camera zooms in, then blends in with feathered edges. The GPU and software fallback use the same geographic extent. Country borders are brighter and thicker: Iran uses #ff1838 with weight 2.8, Israel #299fff with weight 1.7, and neighboring countries #ffe329 with weight 1.6. These colors are drawn after the sepia treatment. Camera motion keeps the 2.5-million-pixel rendering budget; the settled target view supports native 4K detail, capped at 8.3 million pixels and twice the CSS pixel density. GPU animation pauses behind games or when the page is hidden. Reduced motion keeps navigation immediate and decorative motion frozen.

Satellite imagery is NASA Earth Observatory, Blue Marble: Next Generation, July 2004, a historical monthly composite. The original 5400 x 2700 JPEG and a 2700 x 1800 crop from the higher-resolution source are retained for offline builds. A prebuilt 4096 x 2048 PNG supplies global terrain; the land mask, city lights, and borders remain 2048 x 1024. The separate regional detail texture is 2048 x 2048. The page neither downloads the original NASA sources nor paints the terrain or city lights on startup. Images decode asynchronously and GPU uploads are spread across frames; terrain uses mipmaps and anisotropic filtering during motion. Image loading respects reduced motion. Surface dots, grid lines, scan bands, and decorative orbital rings have been removed.

City illumination adds geographically anchored lights at 1,251 Natural Earth populated places. GPU rendering adds deterministic clusters, yellow cores, amber and orange-red lights, golden halos, and gentle pulses; the 2D fallback shows illuminated city centers. Lights are decorative illustrations, not measured satellite brightness. Reduced motion freezes the pulse.

The HQ flight moves a perspective camera from a high aerial view to the building; the building keeps its shape throughout. Nearby blocks and street lighting provide parallax. The same canvas stays active as it settles into the HQ panel. Flight clocks pause with the session, restart cancels the flight, and reduced motion opens the finished HQ view immediately.

The approach uses softer acceleration, gradual perspective travel, a restrained orbit, and a 1.1-second docking move. Camera frames run independently of the 100 ms game UI updates. The HQ drawing buffer stays stable during docking, and the hidden globe stops rendering once the city fully covers it.

## Regenerating globe artwork

The committed textures are generated using the development-only @napi-rs/canvas renderer. After changing terrain, city-light artwork, geography, or country styling, run `npm ci` and `npm run bake:globe`. To regenerate the regional source crop, download the NASA source recorded in scripts/assets/earth-region-july.json and run `node scripts/extract-region.mjs <downloaded-file>`. Tests verify the texture dimensions, source hashes, preservation of fine detail, crop coordinates, and colored borders. These build steps never run in the visitor browser. Base RGBA texture storage is 56 MiB at startup and 72 MiB after regional detail loads, excluding mipmaps and driver overhead. The asynchronous loading path and lightweight startup rendering budget remain in place; browser-wide startup latency has not been profiled after this upgrade.
