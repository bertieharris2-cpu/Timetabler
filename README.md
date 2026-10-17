# Lifehouse Timetabler

A visual planner for Lifehouse's weekly timetable. It shows **who** each child is with and **where** they are. The school's spaces are laid out as a map. For each day and period you drag pupils and staff into rooms, type what the lesson is, and the app checks the plan as you go. It prints a timetable for every pupil, every member of staff and every room.

It is one HTML file. It needs no internet, no installing and no server, and it never sends anything anywhere. That is why real children's names are safe to type into it on a school computer.

## Files

| File | What it is |
| --- | --- |
| `lifehouse-timetabler.html` | **The app: the one file to open.** Double-click it to run in Chrome or Edge. |
| `tests/app.test.js` | Browser test of the whole app (drag and drop, touch, copying, undo, saving, backups, CSV, printing, layout editing, bringing in old saves). |
| `reference/handover-oct-2026/` | From the earlier prototype's handover pack: the project brief, the next-steps notes and the room coordinates. |

## Using it

1. **Open** `lifehouse-timetabler.html` in Chrome or Edge.
2. **Add people** once. To look around first, choose **Try the example school**: made-up pupils and staff with a filled-in week, on whatever rooms and map are loaded. In **Setup**, paste pupils' initials and staff names, or use **Open a file…** to load a people list (a CSV with `name` and `role` columns, such as the old `people.csv`). Mark part-time people as not in on the days they don't come.
3. **Plan.** Pick a day and period from the strip at the top, then drag names onto the map.
   - Tap several names, then tap a room, to move a group together. Tap a room's numbers to pick up everyone in it.
   - Type the lesson into the box under the room's name. Each room has its own lesson for each period.
   - **Free rooms** in the tray lists the rooms with nobody in them this period.
   - **Off-site places** (such as the woods or the stables) sit on the map like rooms and take a lesson name. Add more with **Add an off-site place** in Setup or Edit layout.
   - **PPA** and **Cover** are staff-only boxes on the map. Use **Not in this period** in the tray for absence.
   - **Copy period to…** and **Copy day to…** repeat a period or a whole day elsewhere in the week.
   - <kbd>←</kbd> <kbd>→</kbd> change period. <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes and <kbd>Ctrl</kbd>+<kbd>Y</kbd> redoes. <kbd>Esc</kbd> clears a selection.
4. **Use every space.** Switch the map from **People** to **Room use** (bottom right). Each room is shaded by how much of the week it has pupils in, and shows a small grid of its week: a row per day, a square per period. The tray lists the rooms least used first. Click a square to plan that period. Each place has a type in Setup: a learning space, a staff space (such as the office) or an off-site place. Only learning spaces count towards room use and free rooms.
5. **Check.** Each period in the strip shows ✓ when everyone is placed, a number for pupils not placed yet, and ! for a room with pupils but no staff. **Week** shows the whole week by room (which rooms are free when) or by person (each person's week in one row), with a list of things to check.
6. **Print.** **Timetables** makes one A4 landscape page per pupil, member of staff or room, plus a whole-school sheet for each day. To email them, print to PDF.

The map starts in the **roomy layout**: the school's rooms in the same arrangement as the floor plan, each big enough for a list of names. **Setup → Change map layout** switches to the **to-scale** layout on the floor plan drawing and back; names, room types and everyone's places stay put. The off-site place called "Local village" can be renamed in Setup; the name stays on your computer.

**Full screen** (top right, or press <kbd>F</kbd>) hides the browser's bars and tightens the app around the map. <kbd>Esc</kbd> or <kbd>F</kbd> leaves it.

**Edit layout** (bottom right of the map) moves, resizes, renames, adds and removes rooms. To make the map look like the school, add a **floor plan picture** (a drawn site plan, or a photo of the fire evacuation plan) and drag the rooms onto it, draw **building outlines** behind the rooms, and place **labels** such as "West building" or "Yard". Double-click any name on the map to rename it. If you redraw the picture later, keep it the same shape and the rooms stay where they are. **Setup** also sets period names and times, and optional limits on how many pupils a room takes. You can also set how many PPA periods each member of staff needs, and the Week view warns when someone is short.

## Saving and backups

- Everything saves by itself **in the browser on that computer**. It is not shared between computers or browsers. Clearing browser data deletes it.
- **Save backup** downloads the whole plan as a `.json` file. The button shows a dot when there are changes since the last backup. To carry on on another computer, open the backup there with **Open a file…**.
- **Setup → Start a new half-term** keeps the rooms and people, and starts either from the current timetable or from an empty one.
- **Export for Excel** gives a CSV with one row per person per period, or one row per person with the week across.
- The first time it opens, the app offers to bring in a plan saved by the earlier map prototype on the same computer. That prototype had no days, so its P1–P4 placements go into Monday.

## Privacy

This repository is **public**. Pupils' names or initials, real staff names, people lists and timetable backups must never be committed here. The example school uses invented names only. The app ships with the room layout only: people are added on the computer that uses it, and they stay in that browser and in your backup files. `.gitignore` blocks the default backup and export file names and a `private/` folder as a safety net.

## Running the tests

The test uses invented names. It needs Node and Playwright with Chromium:

```
NODE_PATH="$(npm root -g)" node tests/app.test.js [folder-for-screenshots]
```

## Not built yet

These came up in the brief and notes and are left for later: locking definite lessons, filling the rest of the timetable automatically, preferences between particular pupils and staff, and minimum outdoor time. The app is built so these can be added on top of the current plan without changing how it is saved.
