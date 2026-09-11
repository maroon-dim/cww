# Iran map and company sources

Updated 11 September 2026. This is a fictional, visual-only simulation. Markers use rounded city-level coordinates to represent an associated headquarters or operating city, not individual facilities or precise addresses. Company logos do not imply affiliation. No real network actions occur.

The Iran outline uses the IRN feature of [Natural Earth 1:10m Admin 0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries.geojson), including its island polygons. Natural Earth data is public domain. Iran is rendered in red alongside the previous Israel demo outline in blue. The restored Israel outline is the earlier user-selected extent combining Israel, the West Bank, and Gaza without their shared internal boundaries; it is not an assertion of internationally recognized sovereignty. Both outlines use the same projection and fit together in the initial view.

| Company | Representative city | Location source |
| --- | --- | --- |
| HESA | Shahin Shahr | [Company overview](https://en.wikipedia.org/wiki/Iran_Aircraft_Manufacturing_Industries_Corporation) |
| Iran Electronics Industries | Shiraz operations | [Published company entries](https://www.treasury.gov/ofac/downloads/sdnew13.pdf) |
| Iran Aviation Industries Organization | Tehran | [Published organization listing](https://www.mofa.go.jp/region/middle_e/iran/pdfs/measures_unsc_1009_annex1.pdf) |
| SADRA | Bushehr shipbuilding operations | [Company overview](https://en.wikipedia.org/wiki/SADRA) |
| ISOICO | Bandar Abbas region | [Islamic Development Bank project notice](https://www.isdb.org/project-procurement/tenders/2009/supply-and-installation-electrical-installations-graving-docks) |
| Iran Tractor Manufacturing Company | Tabriz | [UN agricultural machinery directory](https://www.un-csam.org/images/bbsImage/IranAgmachine.pdf) |

Logos are bundled locally. Logo provenance is recorded in dist/logos/sources.json. Markers stay centered on their map coordinates during pan and zoom; no connector lines or automatic geographic offsets are used.

## Regional context

Lebanon, Syria, Jordan, Iraq, Saudi Arabia, Kuwait, and Turkey use their matching Natural Earth Admin 0 geometries, rendered as yellow outlines behind Israel and Iran. All countries share one geographic projection and camera; the fit control shows every displayed country with Israel near the horizontal center.

The animated connections originate at an illustrative country-level point (35 E, 31.7 N) within Israel. Their paths, traffic pulses, and destinations are fictional simulation graphics, not observed traffic or claims of real attacks.

## Concept headquarters
The company-branded HQ scenes are original procedural architectural illustrations created in code for this exhibition. Building shapes are illustrative and do not represent surveyed or verified headquarters. No external 3D assets are used.

## Globe land geometry
Natural Earth 1:110m land polygons (public domain), bundled in dist/globe-land.js. Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson . Regional boundaries retain their existing sources and extent. The smooth sphere, lighting, and raised arcs are generated in local code. Land polygons provide a lighting mask; visible terrain comes from the satellite composite below.

## Satellite surface
NASA Earth Observatory, Blue Marble: Next Generation, Base Map, July 2004. Credit: NASA Earth Observatory. [Source page](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/). The [5400 x 2700 global source](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg) is bundled unchanged as dist/textures/earth-blue-marble.jpg. The [21600 x 10800 source](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg) supplies a native 2700 x 1800 regional crop covering 25–70 E and 18–48 N, stored as scripts/assets/earth-region-july.jpg. Its source hash, dimensions, and bounds are in the adjacent JSON file; scripts/extract-region.mjs reproduces the crop. The displayed surfaces preserve spatial satellite detail with blue color grading and mild local sharpening, generated offline by scripts/bake-globe.mjs and scripts/terrain-surface.mjs. The browser loads globe-terrain.png and a deferred globe-region-detail.png; the other texture files contain geography and city-light overlays. This is a historical monthly composite; local lighting, borders, city lights, and attack arcs are exhibition overlays.

## City illumination
City positions and relative population weights come from Natural Earth 1:50m populated places (1,251 entries, public domain): https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_populated_places_simple.geojson . The bundled globe-cities.js retains longitude, latitude, and population weight. Street-like clusters, colors, halo sizes, and pulses are artistic effects, not satellite night imagery or observed network activity.
