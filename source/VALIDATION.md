# Validation summary — November 20, 2026

- Oxford Square: 300 m; rotation -10 degrees; no tagged or explicitly retained landmark cut by the plot edge.
- Campus historic core: 740 m (widened from 600 m on 2026-11-21 to include Lamar Hall); rotation 0 degrees; no tagged or explicitly retained landmark cut by the plot edge.
- Headless Chrome renders completed without reported page errors across four seasons and each special scene.
- Landmark views checked at close range; six yaw directions and a bird’s-eye view checked for both dioramas.
- Courthouse drawing order corrected so the porticoes remain visible in front of the body.
- Courthouse lawn added as an explicitly approximate, photo-based landscape; campus tree density thinned to preserve open sightlines.
- Diorama Field notes dialogs open and close; pause toggles work; no horizontal page overflow at tested widths.
- 390 × 844 phone layouts checked for both dioramas and the campus-wide map.
- Campus-wide map: 1,317 displayed building outlines and 159 searchable named places. Search for The Lyceum focuses its position; zoom and reset work.
- Atlas home: all three preview images load and all three map cards exist, with no horizontal overflow on desktop and phone.
- Each map opens from a local file. Its rendering assets and map data are embedded. Research links need an internet connection.

Individual decorative proportions and tree locations have not been surveyed. The illustrations should not be used as architectural or navigation surveys.

## Architectural refinement checks

- Detailed courthouse, City Hall, Square Books, City Grocery, Lyceum, Ventress, Bryant, Peabody, Brevard, Fulton Chapel, and observatory treatments compared with reference photographs and descriptions.
- Narrower sash panes, arched openings, cornices, lintels, column capitals and fluting, gallery floors and railings, louvered belfry openings, clock faces, roof seams, and chimneys inspected in close renders.
- Lyceum body trimmed behind the open portico so all six columns remain visible in front.
- Ventress rounded wing, dormer/fanlight, turret floor bands, and cylindrical window planes inspected after correcting drawing order.
- Both dioramas re-rendered at six close viewing directions and a high view without reported page errors.
- Four seasons and special scenes checked after the elevation painter changes.
- Phone-sized renders and Field notes/pause checks passed with no horizontal page overflow.
- The live server was checked to serve the updated campus drawing code.

These remain researched illustrations. Exact unmeasured dimensions and unseen elevations are interpreted.

## Street-life and depth update

- Physical cornice/sill projections and expanded cache bounds checked in low and compass-direction renders.
- Sedans, SUVs, pickups, hatchbacks and vans, mirrors, wheel details and vehicle contact shadows rendered; bicycles and racks rendered.
- Ordinary desktop check: Square had 2 moving cars, 18 moving bikes, and 164 moving walkers at the sampled instant; campus had 8 cars, 24 bikes, and 164 walkers. Counts vary over time.
- Special desktop scenes: 540 added Square gathering figures and 860 campus gathering figures, in addition to moving pedestrians. Counts are illustration budgets, not event attendance figures.
- Phone checks: 297 and 469 gathering figures, respectively; moving traffic, controls, pause, and horizontal fit passed.
- No animated cars or bikes in the event-closed traffic scenes. Parked transport remains in mapped parking/paving areas.
- Calm/Gusty produced different scene-canvas pixel hashes with simulation time paused, confirming that wind visibly affects the scene.
- Left/right rotation, low/high tilt, wind strength cycling, and pause assertions passed for both maps.
- Sample steady-camera desktop rendering times: approximately 8–22 ms per worker frame on this machine; these are check samples, not cross-device performance guarantees.
- Four compass views, high view, and lower views rendered without reported page errors on both maps.
- Both pages were retrieved from the running localhost preview and checked for the updated runtime and controls.

## Handoff portability check

The full bundle was archived, extracted to a separate folder, and rebuilt using the system Python 3.9 interpreter and the supplied rebuild.py. Both rebuilt diorama HTML files exactly matched the delivered files, including embedded application code/data, atlas navigation, and final control styles. Every local HTML asset/link resolved in the extracted copy. The serve.py help/argument entry point passed. MANIFEST.sha256 records packaged-file checksums.

## Measured-layer pass

- survey.py: Square 62 of 62 buildings measured, 91 trees, relief 15.2 m; campus 69 of 71 buildings measured (Duff Center and The Inn at Ole Miss are not), 1,012 trees, relief 22.8 m.
- Headless Chrome renders with no page errors: Square (overview, south-side shops, City Hall, courthouse, street level, festival, Faulkner statue, low terrain view) and campus (overview, Lyceum, east, tailgate, Meredith monument, low terrain view), across spring, summer, autumn and the special scenes.
- In-app browser: both dioramas and the campus map loaded with an empty error console; steady-camera frame times about 40 ms (campus overview), 60–75 ms (campus close), 58 ms (Square overview).
- Winter overview of each diorama and a 390 × 844 phone render of the campus completed without page errors.
- Not re-tested in this pass: phone interaction by hand, reduced-motion start, and the six review angles per landmark.

## Ground materials pass (2026-11-21)

- Campus plot widened to 740 m with a fresh OpenStreetMap extract and a re-run of survey.py on the same lidar.
- Headless Chrome renders with no page errors: campus (overview, Student Union, Lamar Hall, Walk of Champions, Lyceum) in spring, summer, autumn, winter and gameday; Square (overview, courthouse, south-side shops) in spring, autumn, winter and the Double Decker scene.
- Forecourt layouts follow three supplied photographs and the NAIP aerial; exact dimensions, planter counts and the position of the Walk of Champions arch are approximate.
- Frame time with the camera moving, measured in a hidden browser pane (which inflates the numbers): 600 m campus about 120 ms, 740 m campus about 180 ms. The ground painting itself measured about 5 ms; the rest of the increase is the larger plot.
- Square courthouse grounds pass: headless Chrome renders with no page errors for overview, courthouse, courthouse grounds, south-side shops and Faulkner statue in spring, summer, autumn, winter and the Double Decker scene.

## Roof pass (2026-11-21)

- roofs.py: Square 62 of 62 buildings, 170 facets, 476 risers; campus 69 of 71 buildings, 468 facets, 2,148 risers.
- Close-up winter renders from above were made in a grid over both plots (4 tiles on the Square, 9 on campus) after each change to the method. Most tiles were inspected in the final state, not all: the tiles do not cover every building, and campus tiles 2 and 8 were not looked at after the last change.
- Known remaining faults: some buildings with many dormers or wings are simplified to fewer planes than they have; low-slope shed roofs behind parapets are drawn level; a few steps between roof levels are a metre off their true line; the custom landmark models (courthouse, City Hall, Lyceum and the other named halls) keep their hand-built roofs and were not re-measured.
- Summer: the haze wash over the finished frame was 38% tan, which flattened every colour and hid the shadows. It is now a 7% warm cast and summer shadows are drawn at normal strength. Checked on Student Union, campus overview, Square overview and courthouse grounds.

