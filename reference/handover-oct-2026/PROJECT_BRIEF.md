# Lifehouse Scheduler — project brief and handover

**Status: working proof of concept, 17 October 2026.**

## 1. Why it exists
The headteacher currently prepares a complicated paper timetable every half-term. Lifehouse has a small pupil population but a high staff-to-pupil ratio, with individualised and small-group provision rather than fixed, conventional classes. The purpose is to make arranging and revising the timetable **visually easier**, without first attempting a sophisticated automatic timetabling solver.

## 2. Agreed simple approach
- Represent the school as **boxes arranged approximately like the actual spaces**.
- For the active lesson period, drag **children (initials)** and **staff (names)** from an unassigned list into spaces, or back out again.
- Type a **lesson title specific to the room and the period**; a room has no permanently assigned subject.
- Support four one-hour lesson blocks per day, initially P1–P4.
- Allow the user to move/resize the room boxes in a layout-edit mode.
- Export allocations, room names, lesson titles and people to an **Excel-compatible CSV**.
- Keep the app lightweight and usable via a **single HTML file that opens in a browser**. No Node or server needed for this edition.
- Keep school layout and people allocations separate so a blank timetable can start from the same layout.

**Essential distinction:** the current proof of concept has four lesson tabs **but no Monday–Friday distinction yet**. A real weekly timetable requires day selection and assignments per day/period. The CSV is a flat data export, not a formatted Excel weekly timetable.

## 3. Current usable file
Open `01_Current_App/lifehouse-map-view-baked.html` in Chrome or Edge. This is the latest version, based on the user's personally arranged map.

It includes:
- 22 named areas from the Word layout, arranged using coordinates from the saved layout.
- 21 pupil initials and 23 staff names, as supplied in chat.
- Drag and drop of individuals for P1–P4.
- A separate lesson title per area/period.
- Editable room positions and sizes; automatically saves in browser localStorage.
- Export CSV (Excel-readable).

**Important:** existing browser localStorage under `lifehouse_map_v1` takes precedence over the baked-in layout, so the file may display previously saved map positions, titles or people allocations when opened on the same computer. A new computer/browser without prior data starts blank, using baked-in positions. **Opening the app does not reset assignments each session.** Keep an export or other backup before clearing browser data.

## 4. Desired real-world workflow
1. Open the visual school plan.
2. Choose day and lesson block (day support is a next step, not yet in this build).
3. Set or change a lesson title in each occupied area.
4. Drag individual children and staff into the room (or drag them back out).
5. Repeat for remaining blocks; inspect and adjust.
6. Export data to Excel for producing usable staff/pupil timetables.
7. Next half-term, use the layout again and make amendments rather than recreate it on paper.

## 5. Future ideas discussed — NOT currently implemented
**Near-term, if genuinely useful:**
- Monday–Friday x four lessons; ability to reuse/copy previous half-term.
- Edit staff/student names and area list directly in app; add/remove people without editing source code.
- A PPA allocation box/category for staff, separate from room teaching allocations.
- A more directly printable or formatted Excel timetable, possibly one sheet per student/staff or a room/day overview.
- Bulk-select/drag a temporary group or pod; avoid needing permanent numeracy/literacy groups.
- Easy export/import of the entire saved project as JSON for backup/sharing across computers.

**Longer-term, optional only:**
- Teacher PPA minimums and other staffing requirements, stored in-app.
- Individual children's relationships/preferences (e.g. preferred/less familiar staff), priorities and bespoke timetable constraints.
- Lock definites (e.g. D&D on Tuesday afternoon), seed literacy/numeracy lessons, auto-fill remaining placements, then manual tweaks.
- Visual checks for uncovered pupils/staff and optional room limits.

Ideas for automatic allocation were brainstormed, **not promised as working**. The user subsequently asked to **dial back complexity** and prioritise the basic drag-and-drop tool.

## 6. What is in this handover pack
- `01_Current_App/` — latest standalone HTML with the bespoke map baked in.
- `02_Earlier_HTML/` — earlier versions: editable layout before baking, straightforward drag/drop grid, and grid with lesson title/CSV export.
- `03_React_Experiments/` — older Node/Vite React ZIPs. These were harder to set up and the drag/drop was reported as unreliable; **not recommended as the starting point**.
- `04_Data_and_Notes/` — people CSV, early optional key-student template and ideas notes. Some ideas are outdated and not requirements.
- `05_Layout/` — extract of the 22 room coordinates baked into the current HTML, in JSON and CSV for safekeeping.

## 7. Known limitations / follow-up checks
- The app is local: browser storage is computer/browser-specific, not an automatically shared multi-user database.
- The bespoke-map current version does not implement the PPA area, even though PPA was discussed in an earlier grid prototype.
- It does not have native XLSX export; CSV opens in Excel, and additional formatting must be done in Excel.
- No day-of-week selector or student/staff-specific printable schedules yet.
- No constraint engine, automatic staffing checks, permanent pods, direct in-app staff/student editor, or automatic scheduler yet.
- There is no independently performed end-to-end browser test of this handover pack; verify drag/drop, editing, persistence and CSV before using for live planning.
- The original `Lifehouse_scheduler_layout.docx` and the original uploaded full state JSON could not be recopied into this pack from the available file storage. The critical room coordinates *have* been recovered from the baked HTML and supplied as `saved_room_layout_extracted.json`. Keep a copy of the original Word document separately.

## 8. Suggested next change
**Add weekday tabs (Mon–Fri) to the current HTML, retaining the 22-room bespoke layout and the four period tabs, then give it a reliable Save/Backup/Restore function.** This is a small and meaningful improvement toward replacing the paper timetable, without introducing complicated automation.
