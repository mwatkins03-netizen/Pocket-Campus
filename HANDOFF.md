# Oxford Pocket City Atlas — Handoff

Prepared November 20, 2026. This revision adds a measured layer under the illustration: real terrain, measured roofs and wall heights, and surveyed trees.

## What is in the atlas

| File | Scope | Main features |
|---|---|---|
| `index.html` | Atlas starting page | Links, previews, sources |
| `oxford-square.html` | 300 × 300 m downtown diorama | Courthouse Square on its ridge, shops, landmarks, seasons, Double Decker scene |
| `ole-miss-campus.html` | 740 × 740 m historic-core diorama | Lyceum, Circle, Grove, nearby halls, seasons, gameday scene |
| `campus-overview.html` | Wider north-up campus map | Search, pan, zoom, 159 places, hillshade and 2 m contours |

## What changed in this pass

**Terrain.** Both dioramas stand on bare-earth elevations from the 2018 USGS 3DEP lidar flight, at true scale. The Square plot has 15.2 m of relief (143–158 m above sea level), the campus plot 22.8 m (134–157 m). Ground polygons are draped over the surface; buildings, trees, lamps, cars, cyclists and people stand at their own ground height; buildings show a foundation where the ground falls away; the cut edges of each plot show the profile, ruled every metre. One-metre contour lines can be switched with **Contours**. The wider campus map has hillshade and 2 m contours from the USGS elevation service.

**Buildings.** 62 of 62 Square buildings and 69 of 71 campus buildings carry measured roofs: planar facets fitted to the lidar returns over each OpenStreetMap footprint, with the steps between roof levels, so pitches, hips, valleys, penthouses, parapets and rooftop plant are the surveyed ones. Each wall rises to the eave measured along that edge. Roof colours come from the NAIP aerial photograph. The Duff Center postdates the lidar and keeps an interpreted height. The hand-built landmarks (courthouse, City Hall, the Lyric, Square Books, City Grocery, Lyceum, Ventress, Bryant, Peabody, Brevard, Croft, Carrier, Shoemaker, Fulton Chapel, observatories) keep their custom models and now sit on the terrain.

**Roofs, second pass (2026-11-21).** The first measured roofs were a mosaic of small squares, which left ramps, shards and ragged steps. `source/survey/roofs.py` now reads each roof as a few planes: planes are grown from the lidar returns and merged; a slope is kept only if it has a partner across a ridge, hip or valley, or covers most of the building, and anything else is drawn level; boundaries between levels are squared to the building; ridges and hips are straight lines where two planes meet; parapets are drawn where the rim returns stand above the roof. The Square went from about 2,500 facets to 170 and the campus from about 7,900 to 468. `survey.py --sheet <folder>` writes check sheets (height raster beside the facets) and `--fixes roof-fixes.json` accepts per-building corrections (`flat`, `level`, `pitched`, `amin`, `skip`).

**Façades.** Shopfronts appear on every wall that faces a carriageway, with bulkheads, transom bars, cast-iron pilasters, recessed doors, mapped shop names, corbelled brick bands and striped awnings. Rear and party walls have service doors, small windows, downpipes and condensers. Campus brick has stone quoins and a water table.

**Photo-referenced fronts on the Square.** Thirteen dated Wikimedia Commons photographs (listed in `SOURCES.md`) set the colours and features of: the Thompson House, Trustmark, Bouré, FNB, Neilson's, the five fronts of the south-east block (Village Tailor, Hinton & Hinton, A C's, Off Square Books, The Frame Up), the building west of Square Books, Square Books, the Lyric, and the marble monument. The west-side canopies and the Oxford Grillehouse gallery come from one aerial and are approximate. These live in `source/square/city.json` under `buildings` (fields `gallery`, `canopy`, `heads`, `motif`, `fronts`, `minWall`, `shutterColour`). `fronts` splits one mapped outline into several real façades. About 40 other Square buildings, mostly off the Square itself, still have generic fronts. View buttons *North side*, *South side* and *West side* show the rows.

**Ground materials and forecourts.** The ground is now drawn as materials, not flat fills (`source/pocket-city/assets/kit/groundworks.js`, switched on by `"ground"` in each `city.json`): mottled lawn with blades and autumn leaf litter, asphalt with aggregate, patches and cracks, concrete walks with a scored joint every 1.8 m along the mapped footways, concrete panels in several tones, herringbone and running brick, pavers, stone slabs and pine-straw mulch. The lidar terrain is shaded from the same light as the cast shadows. Every kerb has a shaded gutter, every lawn a trimmed edge, every building a contact shadow, every tree a mulch ring or grate, and campus buildings that face open ground have mulched beds with shrubs (azaleas flower in spring). Three forecourts are built from the user's photographs with real steps, raised planters, benches, twin-globe lamps, bollards and chain, a bike rack and a campus sign: the Student Union's Grove front and north-east front, the Walk of Champions with its arch, and Lamar Hall. The Union has its limestone-and-brick portico and Lamar Hall its buff precast bands. The campus plot grew from 600 m to 740 m, same centre, to take in Lamar Hall.

**Courthouse grounds and parking courts.** `source/square/grounds.py` (needs shapely) turns the area inside the Square's road loop into what the aerial shows: asphalt parking courts instead of pavement and lawn, the courthouse grounds inside an iron fence on a kerb wall with four gates, a pavement ring, lawn, panelled walks on the door axes, a mulched bed with shrubs round the building, flower beds, wooden benches and twin-globe lamps at the north and south gates, a stone apron under the monument (moved onto the south walk), flower medians on Lamar and mulched islands under the trees in the courts. It always starts from `source/square/scene-osm.json`, the untouched map scene.

**Trees and street features.** 91 trees on the Square and 1,012 on campus stand where the lidar canopy shows them, with surveyed heights and crown widths. The mapped William Faulkner statue and James Meredith monument are drawn, plus a stone monument south of the courthouse, planters, benches, litter bins and painted parking bays.

**Views.** New view buttons: *Courthouse grounds*, *Student Union*, *Lamar Hall*, *Walk of Champions*, *Faulkner statue*, *James Meredith monument*, and *Lie of the land* (a low view that shows the slope).

## How to open

Extract the whole folder and open `index.html` in Chrome. Nothing to install. For a local server: `python3 serve.py` then `http://127.0.0.1:8000/`.

## Source of truth

| Location | Responsibility |
|---|---|
| `source/square/`, `source/campus/` | `scene.json` (OSM geometry), `survey.json` (measured layer), `city.json` (styles, seasons, cameras, notes), `landmarks.js` (hand-built models) |
| `source/pocket-city/assets/kit/groundworks.js` | Ground materials, relief shading, planting, and the forecourt vocabulary read from `"ground"` in each `city.json` |
| `source/square/grounds.py` | Rewrites the Square carriageway and writes the courthouse grounds into `city.json` (run before `rebuild.py square` if the map scene changes) |
| `source/survey/ept.py` | Downloads lidar points for a box from the public USGS bucket |
| `source/survey/roofs.py` | Roof reconstruction: lidar returns over one footprint → planes, risers, wall heights, parapets |
| `source/survey/survey.py` | Lidar + NAIP → terrain grid, per-building ground level, wall heights, roof facets, roof colour, trees |
| `source/survey/overview_relief.py` | Adds hillshade and contours to `campus-overview.html` |
| `source/pocket-city/assets/kit/city.js` | Scene engine: terrain (`groundZ`, `drape`, `lifted`), measured roofs, façade painters, furniture, crowds |
| `source/pocket-city/assets/kit/painter.js`, `foliage.js`, `models.js` | Canvas painting and caching, tree crowns, vehicles and people |
| `source/pocket-city/assets/page.js` | UI, cameras, workers, controls (including Contours) |
| `rebuild.py` | Merges each `survey.json` into its scene and rebuilds both dioramas |

Rebuild: `python3 rebuild.py` (Python 3.9+, no packages). Re-survey (only if footprints or lidar change): Python with numpy, scipy, shapely 2, pillow, laspy[lazrs], tifffile, then

```bash
python3 source/survey/ept.py 34.3663739 -89.5187108 260 square.npy
python3 source/survey/survey.py --scene source/square/scene.json --plot source/square/plot.json --lidar square.npy --naip naip_square.png --naip-bbox=-89.5215,34.3640,-89.5159,34.3688 --cell 2.5 --out source/square/survey.json
```

(campus: plot size 740 in `source/campus/plot.json`; centre 34.3663426 -89.5347368, half-width 400, bbox -89.5392,34.3627,-89.5303,34.3700, cell 3). The NAIP image is a 1024 px export of that bbox from the USGS NAIP ImageServer.

How terrain works in the engine: `SCENE.terrain` is a grid of heights above the plot's lowest point. Ground outlines are densified and projected at `groundZ`. Objects are drawn inside `lifted(dz, fn)`, which slides the orthographic projection by the object's ground height, so landmark code keeps its own z = 0 floor. Each building's floor is the highest ground on its outline; `skirt()` draws the wall below it.

## Checks performed

Headless Chrome renders of both dioramas (overview, landmark close-ups, low terrain view, statue views, street level) in spring, summer, autumn and the two special scenes completed with no page errors. In the in-app browser the pages loaded with an empty error console; the Contours control is present; the campus map shows relief. Frame times on the development Mac with a steady camera: campus overview about 40 ms, campus close-up 60–75 ms, Square overview about 58 ms. Turning the camera redraws everything and is slower than before this pass, most of all on the campus. One winter render of each diorama and one 390 × 844 phone render of the campus also completed without errors; phone interaction was not tested by hand.

## Accuracy and limits

- Lidar is from 2018. Anything built or altered since keeps its 2018 form (or, for the Duff Center, an interpreted block). The Student Union appears as it stood mid-expansion.
- Roof facets are fitted with a 0.4 m tolerance on a 1 m grid, so small roof features are simplified and a few tree-covered roof edges are ragged.
- The lidar was aligned to OpenStreetMap by a single shift per plot (1.8 m on the Square, 1.3 m on campus). Footprints are OSM's and can be a metre or two off.
- Tree species, leaf colours, wall colours, window patterns, storefront details, fronts without a photograph, awnings, planters, benches, parking bays, people, traffic, wind and event layouts are interpreted. Photographs date from 2006 to 2023, so a front may have changed. Three street fronts hidden from the lidar by their own galleries were raised by hand to two storeys (`minWall`).
- Landmark models were not re-measured against the lidar; their heights were compared and are within roughly 2 m.
- The atlas is local/offline; no public hosting has been set up.

## Sources and license

See `SOURCES.md`. Map data © OpenStreetMap contributors (ODbL). Elevation and lidar: U.S. Geological Survey 3D Elevation Program (public domain). Aerial imagery: USDA NAIP (public domain). Pocket City drawing kit by April Zhu, MIT (`source/pocket-city/LICENSE`).
