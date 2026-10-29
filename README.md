# SignalMaker

A browser-based traffic signal editor with mast arms, span wires, supplementary pole-mounted heads, street-name signs, and regulatory signs.

[Open SignalMaker](https://duskdarf1.github.io/SignalMaker/)

## Run locally

No framework or build step is required. Open `index.html` in a browser, or serve this directory:

```sh
python3 -m http.server 8000
```

Projects are saved locally in your browser. Regulatory Signs supports uploading your own sign images; uploaded artwork is saved with the project and can be reused from the sign picker. Copy and download produce PNG images.

## License and attribution

SignalMaker derives its UI from the [SignMaker v2.2](https://github.com/DuskDarf1/SignMaker) and [SignMaker v2.19 development projects](https://github.com/XtraLqrge/SignMaker). The inherited project history and GNU GPL version 3 license are retained; see [LICENSE](LICENSE).

Credit to [XtraLqrge](https://github.com/XtraLqrge) for the search function in the regulatory sign selector, the icon upload feature, the clear all button, the click-to-open menu action, the undo/redo feature, custom regulatory sign uploads, template saves, and mast-mounted street signs.

Regulatory artwork provenance and extraction metadata are retained in `assets/regulatory-signs/`.


Pedestrian supplementary heads use the solid walking-person and upraised-hand
vectors extracted directly from MUTCD 11th Edition Figure 4I-1 (printed page 718),
with white WALK and Portland-orange DON'T WALK displays. Select Pedestrian in a
supplementary head's Layout controls; ordinary heads cannot use this layout.
The enlarged 20 × 18-inch display envelope is based on the nominal 16 × 18-inch MoboTrex
SG7SZ20C3FFF10-21 listed as FDOT APL 653-024-002. Door inset and visor details
are schematic; the APL listing provides no fabrication drawing. The larger symbols
are left aligned to leave space on the right, as on countdown heads. Both indication
states share the preview and PNG export renderer and are saved locally.
Sources: https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part4.pdf and
https://pathdev.fdot.gov/Products/Index/3822?approvalId=3822.

Supplementary side brackets have a Left/Right selector (as viewed on screen),
retained locally and in exports. Pole-head scenes reserve both bracket envelopes
so switching direct/side mounts or bracket sides preserves the preview fit scale.


New mast arms default to Left; saved explicit Right choices are retained.
Support Editor's Add Mast Arm / Remove Mast Arm buttons and Mast Arm selector
manage multiple independent assemblies in the same approach. The Heads, Head
Editor, Street Signs and Regulatory Signs controls edit the selected assembly;
clicking a head or sign on another arm selects that assembly automatically.
Pole Spacing measures horizontal center-to-center distance between adjacent
poles, in feet (60 ft by default), with all poles aligned to the same grade.
Each assembly retains its own geometry, heads, signs and mounting positions.
Whole-scene preview and PNG exports include every arm; individual-head copying
still omits supports and signs. Arm removal is undoable, and all arms and the
approach spacing are saved locally. Older single-support projects remain valid.

The toolbar's Mast Arms popover follows the Heads selector: add, duplicate,
select, and remove without closing it; drag rows (including touch) or use
Up/Down keys to reorder. Arm names, selection, and each assembly's saved
mounting distances travel with the assembly. Clicking a pole or arm opens its
Support Editor; keyboard users can focus a support and press Enter or Space.

Selecting a mast arm flashes the same 500 ms yellow outline as a head. Dragging
a mast arm in the preview reorders assemblies with insertion markers, the
inherited 0.12 s ±2° / 1.02-scale wiggle, and a faded source. Mouse, touch and
pen are supported; Escape cancels. Dropdown dragging also wiggles the supports.


Street-sign Control Text rows support separate superscript and subscript
suffix elements. Use Add Superscript / Add Subscript, then the Text Element
selector to edit their text, font, size and color with the existing controls.
Each element stays on its parent row and defaults to 60% of the main text size.
Row alignment, line height and arrows remain on the main text. Elements retain
local storage, duplication, undo/redo and shared preview/PNG font rendering.

New superscript and subscript elements default to “Bch”. Their Position dropdown
places each element to the left or right of the main text on its row (Right by
default); placement is retained in saved projects, duplication and PNG exports.


Templates adapts SignMaker v2.2's saved-template list, search/sort, add/replace
controls, optional load warning and canvas-based Template Editor. Save a selected
Head, Mast Arm, or complete Approach. Templates have an Original version and
named variants; street-sign fonts can be applied to a variant, including script
elements. Save & Exit or Cancel restores the drawing that preceded template
editing, and that drawing remains the browser's saved project while editing.
Replace Head can also be dragged onto a preview head. Template applications are
undoable; the library persists locally, with session fallback when storage fails.
Built-in templates are SignalMaker's linear, cluster, HAWK and pedestrian heads.
SignMaker's unrelated sign-template collection is not imported.

Street Signs includes a searchable Choose Icon dialog following SignMaker v2.2's
thumbnail picker. The requested Orange icon is reused from its
`img/icons/orange_county.svg` (GPL-3.0), retained in `assets/street-icons/` and
rasterized to a transparent PNG for self-contained exports. Uploads are also saved
in `signalmaker-street-icons-v1` localStorage for reuse across signs and reloads.
Existing icons are selectable from the scene; only requested artwork is bundled.

Concrete span poles always use Silver, independently of the selected cable and
hardware color. Span assemblies support supplementary heads on the Left or Right
pole, with direct or side-bracket mounting, independent mount heights, pointer/
touch dragging and vertical arrow keys. Steel and concrete share the same head
placement model. Switching pole material preserves positions and selections.

Street icons have BG Color (including Transparent), Sharp/Round corners and
Square Aspect controls. Artwork always retains its proportions. White to Edges
reserves a full-height square white block at the icon's end of the sign, touching
the top, bottom and outer edge without overlapping text. This overrides color,
rounding and aspect while enabled and retains their prior choices when disabled.
Icon appearance belongs to each sign and persists through storage, duplication,
templates and the shared preview/PNG renderer.

BG Padding adjusts icon background insets from 0–6 inches with a slider and
number field. Ordinary backgrounds grow around the artwork and reserve room
for text; White to Edges keeps the block flush and insets the artwork instead.

Icon Size and per-row Arrow Size use 25–300% sliders with number fields (100%
default). Scaling retains artwork proportions and reserves space in the sign.
Type A uses SignMaker v2.2’s original `img/arrowBlocks/TYPE_A.svg` vector; saved
Type A Extended choices migrate to Type A. Sizes survive restoration,
duplication, templates and PNG export.

Superscripts and subscripts on the same side share one column: superscripts
above subscripts, with the column sized to the wider line. Opposite-side
placement remains independent; preview and PNG use the same layout.
