# Oxford Pocket City Atlas

For a complete handoff, start with **HANDOFF.md**. The bundle includes `rebuild.py` and `serve.py` for portable rebuilding and local preview.

Open **index.html** in Chrome to choose a map. No web server or installation is needed to view the finished maps. The map pages include their drawing code and data; only source links require the internet.

- **oxford-square.html** — a 300 × 300 m illustrated scene of Courthouse Square, rotated 10° clockwise from north. Includes a custom courthouse and clock cupola, City Hall, the Lyric, mapped shops, seasonal views, and an illustrative Double Decker arts scene.
- **ole-miss-campus.html** — a 740 × 740 m illustrated scene of the historic campus core and Grove, facing north in its underlying map coordinates. Includes custom Lyceum, Ventress, Circle halls, Fulton Chapel, and observatory models, four seasons, and an illustrative Grove gameday scene.
- **campus-overview.html** — a searchable, north-up map of the main university grounds and surrounding streets. Includes athletics and western campus areas beyond the detailed diorama. Search for a place or click a named building; drag to pan and use the buttons or scroll to zoom.

In the dioramas, drag to orbit, scroll to zoom, choose a landmark in the legend to fly closer, switch seasons or special scenes, and open **Field notes** for sources and limitations.

## Accuracy and interpretation

Building footprints, roads, paths, and mapped names come from OpenStreetMap, retrieved November 20, 2026. The campus-wide map shows the main campus rather than every property the university owns. OpenStreetMap coverage and business/building names may be incomplete or outdated.

The dioramas are illustrations over a measured base. Ground elevations, building heights, roof forms and tree positions come from the 2018 USGS 3DEP lidar flight, and roof colours from NAIP aerial imagery. Wall colours, windows, storefronts, tree species, people, furniture, traffic, weather, and event layouts are approximate or illustrative. The courthouse landscape and the Lyceum's sub-volumes are interpreted from mapped outlines and reference imagery. The university-wide view retains the mapped grounds outline; no routing or live conditions are included.

The courthouse and Lyceum–Circle nomination documents, university photographs and building descriptions, the state climatologist, Visit Oxford, and Ole Miss Athletics informed the scenes. Full source links appear in SOURCES.md and inside the maps.

## Checks

The dioramas were rendered in headless Chrome across four seasons and their special scene, with landmark close-ups, six viewing directions, and a high view. Search and zoom in the campus-wide map were checked. Phone layouts were also checked. A validation summary and editable map sources are included in the downloadable archive.

## Editing and rebuilding

The archive's `source/` folder contains the scene and city files, custom landmarks, the Pocket City drawing kit and scripts, research notes, and the map-making helpers. The finished pages need no dependencies. To rebuild, use Python 3.9+ with Shapely, Node 22+ for check renders, and Chrome.

Example from the archive root:

    python3 source/pocket-city/scripts/build.py --scene source/square/scene.json --city source/square/city.json --landmarks source/square/landmarks.js --out oxford-square.html

The supplied finished pages also add atlas navigation and hide the six review cameras from the visible toolbar. Their cameras remain available in the source for inspection.

## Credits

Map data © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright).

Pocket City drawing kit and original workflow by [April Zhu](https://april-zhu.com/pocketcity/), MIT license. The skill is installed at `~/.codex/skills/pocket-city` and available for subsequent chats/turns.

## Building detail update

The illustrated maps now include narrower multi-pane sashes, arched openings, lintels and sills, cornices and dentils, fluted columns and capitals, gallery floors and railings, and more individual roof forms. The courthouse, City Hall, Square Books, City Grocery, Lyceum, Ventress, Bryant, Peabody, Brevard, Fulton Chapel, and observatories have individual treatments. The close-view buttons provide an easier way to inspect them.

The updated models remain illustrations rather than measured architectural reconstructions. Reference links for this pass are in SOURCES.md. The authoritative editable geometry is in each map's `landmarks.js`, with façade painters included in the source drawing kit.

## Street life, depth, wind, and viewing angles

Both illustrated maps now have physical cornice and sill projections, richer car meshes including pickups and mirrors, rotating wheel detail, contact shadows, cycling riders, parked bicycles, bicycle racks, flags, and wind in the tree canopies. Cars, cyclists, and walkers have separate simulation limits, so pedestrian activity does not use all the available traffic capacity.

Use **Left / Right** to rotate around the current point, **Low / High** to change the viewing angle, and **Wind: Calm / Breeze / Gusty** to change the breeze. The view strip includes the four compass directions, closer street views, and a full-turn cinematic orbit. Pause stops the animation; reduced-motion preferences start it paused.

The Double Decker and Grove gameday scenes now include additional gathering crowds. Selecting an event opens a closer crowd view. The desktop scenes add 540 festival guests or 860 gameday guests, plus the moving pedestrians; phone layouts draw fewer figures. These counts are illustration budgets, not estimates of event attendance. Animated motor traffic is suppressed in the special scenes; parked cars remain in mapped parking areas. Crowd locations, parking occupancy, bikes, flags, breeze, and small architectural projections are illustrative.

## Measured terrain, roofs and trees

Both dioramas now stand on real ground at true scale: 15 m of relief on the Square, 20 m on campus, with one-metre contours (toggle **Contours**) and the slope shown on the cut edges of each plot. Nearly every building has a roof fitted to lidar returns and walls that rise to the measured eave. Trees stand where the lidar canopy shows them. The wider campus map has hillshade and 2 m contours. New view buttons: **Faulkner statue**, **James Meredith monument**, and **Lie of the land**. Details, limits and the re-survey commands are in HANDOFF.md.

## Publishing on GitHub Pages

Upload the contents of this folder to the root of a repository, then in Settings → Pages choose "Deploy from a branch", branch `main`, folder `/ (root)`. The site opens at `index.html`. `.nojekyll` is included so GitHub serves the files as they are. Nothing needs to be built; the `source/` folder is only for rebuilding.

