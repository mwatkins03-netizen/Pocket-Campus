# Sources and research notes

These pages were read or inspected during the build. The models are interpreted illustrations, not exact reconstructions.

- [OpenStreetMap](https://www.openstreetmap.org/copyright): measured building outlines, roads, footways, green areas, mapped names, and university grounds outline. Data retrieved November 20, 2026.
- [MDAH: Lafayette County Courthouse nomination and photographs](https://www.apps.mdah.ms.gov/nom/prop/31421.pdf): architectural description and north, east, and south photographs; porticoes on arcaded bases and the clock cupola. The source identifies original drawings held in the university collection; those original drawings were not obtained.
- [MDAH: Lyceum–The Circle nomination](https://www.apps.mdah.ms.gov/nom/dist/200.pdf): published dimensions, massing, and architectural descriptions of the historic core. The footprint geometry is OSM; detailed measured plans were not obtained.
- [University of Mississippi: Lyceum photograph](https://olemiss.edu/assets/images/lyceum.jpg): brick colour, white columns, pediment, and dark shutters.
- [University of Mississippi: campus culture and traditions](https://olemiss.edu/who-we-are/campus-culture-and-traditions/): aerial and building photographs, including Ventress and Barnard Observatory. The Ventress reference shows a red roof, corner turret, white trim, and open lawns and paths.
- [University building descriptions](https://catalog.olemiss.edu/university/buildings.pdf): background and architecture across campus. Decorative details are simplified.
- [University astronomy history](https://www.phy.olemiss.edu/Astro/history.html): Kennon Observatory's paired copper-roofed domes.
- [University physics and astronomy](https://olemiss.edu/physics/about-physics/): observatory context.
- [MDAH: Lyceum–The Circle district history](https://www.apps.mdah.ms.gov/Public/district.aspx?id=200&view=facts): the significance of James Meredith's enrollment and the events of 1962.
- [The Cultural Landscape Foundation](https://www.tclf.org/university-mississippi): campus landscape organization, the Circle and Grove, tree species. All individual planting positions in the dioramas are illustrative.
- [Mississippi State Climatologist](https://www.geosciences.msstate.edu/state-climatologist/mississippi-climate): humid subtropical climate, long hot summers, temperate winters, humidity, and spring storm risk. Visual weather is illustrative.
- [Ole Miss Athletics: The Grove](https://olemisssports.com/sports/2018/7/20/trads-the-grove-html): Grove and Walk of Champions tradition.
- [Visit Oxford: tailgating](https://visitoxfordms.com/blog/grove_tailgating/): gameday context and temporary road closures. The scene suppresses animated vehicles for illustration; it is not a traffic plan.
- [Visit Oxford: Double Decker Festival FAQ](https://visitoxfordms.com/double-decker-festival/faq/): arts, food, and music event context. Stalls and crowds are illustrative rather than a surveyed festival layout.
- [Oxford Lafayette Chamber: Historic Square](https://oxfordms.com/about-oxford/oxford-culture/historic-oxford-square/): Square's commercial and cultural context.
- [The Lyric: venue history](https://thelyricoxford.com/about/): theater identity and history.
- [WKNO: Square Books photographs](https://www.wknofm.org/news-and-features/2013-05-17/a-literary-light-in-oxford-mississippi-the-square-books-story): bookstore façade and balcony references.
- [SAH Archipedia: Lafayette County Courthouse and Square](https://sah-archipedia.org/buildings/MS-02-NC18): architectural context.

Reference images are not embedded as assets in the maps; the scenes use original drawing geometry. April Zhu's Pocket City MIT license and OSM attribution accompany the source archive.

## Additional references for the architectural refinement

- [Lafayette County courthouse photograph](https://lafayettems.com/places/lafayette-county-courthouse/): arcaded ground level, four-column portico, tall central arched windows, smaller sash windows on the end additions, cornice brackets, paired tower louvers, clock, dome, and chimneys.
- [Oxford City Hall photograph, hosted by the university](https://olemiss.edu/grisham-mclean-institute/assets/oxford-city-hall.webp): Romanesque window arches, twin gabled front bays, entrance porch, slate roof, chimney, and stone trim.
- [Square Books partner profile and photograph](https://libro.fm/squarebooks/about): orange masonry, arched front openings, long gallery, slender posts, white railings, and dark tile base.
- [University Grounds building photographs](https://www.university-grounds.com/home/university-of-mississippi): Ventress's rounded wing, conical turret, roof fanlight and contrasting trim; lighter masonry and individual entrance and roof forms at Bryant, Peabody, and Brevard. The photographs were inspected directly, including images img-20210320-122306497-hdr, img-3178, img-3158, and img-3200.
- [McCarty Architects: Brevard Hall restoration](https://www.mccartycompany.com/projects/brevard-hall): restoration photographs and brick, stone, cast-stone, and other exterior material descriptions.

This pass replaces repeated generic windows with building-specific opening patterns and entrance treatments. Small ornaments, exact colours, gallery dimensions, roof pitches, and portions of unmeasured plans remain interpretations. Ventress's rounded wing and turret use photo-corrected massing rather than the coarse rectangular OSM outline.

## Street-life layer

This update adds interpreted street-life animation on the same OpenStreetMap geometry. Parked cars are distributed within mapped parking areas, bicycles use mapped roads and cycle routes, and gathering figures are placed on open ground with building, water, tree-trunk, and stall exclusions. The festival scene allows crowds on the closed streets; the gameday scene gathers them in the Grove and Circle. Existing Visit Oxford and Ole Miss Athletics references provide the event context, not exact crowd layouts or counts. Wind strength is an artistic control rather than a live weather feed.

## Measured layer

- [USGS 3D Elevation Program](https://www.usgs.gov/3d-elevation-program): lidar point cloud `MS_MississippiDelta_A1_2018`, read from the public Entwine bucket (`usgs-lidar-public`), for bare-earth terrain, building heights, roof facets and tree canopy in both dioramas; and the 3DEP elevation image service for the wider campus map's hillshade and contours. Public domain. Flown in 2018.
- [USDA National Agriculture Imagery Program, served by USGS](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip): aerial photograph sampled for roof colours. Public domain.

The lidar was shifted 1.8 m (Square) and 1.3 m (campus) to sit on the OpenStreetMap footprints. Tree species, the four shop galleries, the monument south of the courthouse and all street furniture are interpreted, not surveyed.

## Façade references (photo-referenced pass)

Photographs on Wikimedia Commons, inspected as references only; none is embedded in the atlas.

- [Oxford Mississippi Square 2018.jpg](https://commons.wikimedia.org/wiki/File:Oxford_Mississippi_Square_2018.jpg) — Fredlyfish4, CC BY-SA 4.0, 2018-11-17: Thompson House, Trustmark, Bouré and FNB fronts and galleries.
- [The Oxford Square - 48823158808.jpg](https://commons.wikimedia.org/wiki/File:The_Oxford_Square_-_48823158808.jpg) — Ser Amantio di Nicolao, CC BY 2.0, 2019-09-29: aerial: roof colours, Neilson’s canopy, west-side canopies, FNB walkway.
- [Off Square Books at Sunset - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Off_Square_Books_at_Sunset_-_panoramio.jpg) — Panoramio upload bot, CC BY-SA 3.0, Taken on 1: Off Square Books front and both neighbours.
- [Oxford, Mississippi Town Square - Square Books.jpg](https://commons.wikimedia.org/wiki/File:Oxford,_Mississippi_Town_Square_-_Square_Books.jpg) — Infrogmation, CC BY-SA 2.0, 2011-09-03: Square Books colour, hoods and cornice.
- [Oxford, Mississippi Town Square (6120804378).jpg](https://commons.wikimedia.org/wiki/File:Oxford,_Mississippi_Town_Square_(6120804378).jpg) — ויקיג'אנקי, CC BY-SA 2.0, 2011-09-03: monument, Neilson’s, the Village Tailor corner.
- [Lyric at Oxford.jpg](https://commons.wikimedia.org/wiki/File:Lyric_at_Oxford.jpg) — Lthomes, CC BY-SA 4.0, 2016-10-11: the Lyric’s white front, brick side, parapet.
- [OXFORD COURTHOUSE SQUARE HISTORIC DISTRICT.jpg](https://commons.wikimedia.org/wiki/File:OXFORD_COURTHOUSE_SQUARE_HISTORIC_DISTRICT.jpg) — KLOTZ, CC BY-SA 3.0, 2006-10-21: Neilson’s canopy (2006).
- [Civil War Monument and Architecture - Central Square - Oxford - Mississippi - USA.jpg](https://commons.wikimedia.org/wiki/File:Civil_War_Monument_and_Architecture_-_Central_Square_-_Oxford_-_Mississippi_-_USA.jpg) — Adam63, CC BY-SA 3.0, 2012-05-18: marble shaft and figure south of the courthouse.
- [Oxford Square North - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Oxford_Square_North_-_panoramio.jpg) — Panoramio upload bot, CC BY-SA 3.0, Taken on 1: FNB porch from the north (2008).
- [First National Bank Walkway - panoramio.jpg](https://commons.wikimedia.org/wiki/File:First_National_Bank_Walkway_-_panoramio.jpg) — Panoramio upload bot, CC BY-SA 3.0, Taken on 2: FNB covered walkway and shutters.
- [South Lamar Boulevard Oxford Mississippi.jpg](https://commons.wikimedia.org/wiki/File:South_Lamar_Boulevard_Oxford_Mississippi.jpg) — Fredlyfish4, CC BY-SA 4.0, 2018-11-17: South Lamar fronts and awnings.
- [Oxford, Mississippi Town Square - Landry's.jpg](https://commons.wikimedia.org/wiki/File:Oxford,_Mississippi_Town_Square_-_Landry%27s.jpg) — Infrogmation, CC BY-SA 2.0, 2011-09-03: the one-storey row south of the Square.
- [Book store on the square in Oxford MS.jpg](https://commons.wikimedia.org/wiki/File:Book_store_on_the_square_in_Oxford_MS.jpg) — MinTUSTo, CC BY-SA 4.0, 2022-10-20: Square Books shopfront and tile base.

Shop positions come from OpenStreetMap points. Fronts with no photograph keep generic period detail. The west-side canopies and the Oxford Grillehouse gallery were read from one oblique aerial and are approximate.

## Ground materials and campus forecourts (2026-11-21)

- Three photographs supplied by the project owner: the entrance front of Lamar Hall, and two views of the Gertrude C. Ford Ole Miss Student Union's Grove front with the Walk of Champions arch. Used as visual reference for paving, steps, planters, beds, benches, lamps, the sign, bike rack, bollards and the two building fronts. Their photographers and licences were not given; none is embedded in the atlas.
- USDA NAIP aerial image (already listed above): position and extent of the Union plaza and the Lamar Hall forecourt.
- OpenStreetMap extract refreshed for the wider 740 m campus plot. © OpenStreetMap contributors, ODbL.
- All ground textures are generated in code (`source/pocket-city/assets/kit/groundworks.js`); no image textures are used.
- Courthouse grounds and parking courts on the Square: layout from the NAIP aerial; fence, kerb wall, benches, globe lamps, tulip beds and planted medians from four Wikimedia Commons photographs: "Holidays on the Square 2" by Ser Amantio di Nicolao (2022, CC BY 2.0), "Tulips on Square" by Nicolee escobarr (2023, CC BY-SA 4.0), and "Downtown Oxford Mississippi November 2014" and "Oxford Mississippi Square 2018" by Fredlyfish4 (CC BY-SA 4.0). None is embedded in the atlas. Dimensions and planting are approximate.
