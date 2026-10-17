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
2. **Add people** once. To look around first, choose **Try the example school**: made-up pupils and staff with a filled-in week, on whatever rooms and map are loaded. In **Setup**, paste pupils' initials and staff names, or use **Open a file…** to load a people list (a CSV with `name` and `role` columns, such as the old `people.csv`). Pupils are in for every lesson unless you add them under **Reduced timetables** (Setup → Pupils), where you mark the lessons they're not in, day by day. Mark part-time staff as not in on the days they don't come (Setup → Staff). Setup is in sections, chosen from the list on the left: Pupils, Staff, Groups, Subjects, School day, Rooms and map, and Plan and files.
3. **Plan.** Pick a day and period from the strip at the top, then drag names onto the map.
   - Tap several names, then tap a room, to move a group together. Tap a room's numbers to pick up everyone in it.
   - Type the lesson into the box under the room's name. Each room has its own lesson for each period.
   - **The tray** above the map has three views: **Groups** (a card per group, with its members listed down it; names already placed this period are faded), **Left to place** (pupils and staff still to place, side by side) and **Not in** (drop anyone absent this period here). Drag the bar under the tray to make it taller or shorter. Under the period name, a one-line note says how many things there are to check; click it to see the first.
   - **Off-site places** (such as the woods or the stables) sit on the map like rooms and take a lesson name. Add more with **Add an off-site place** in Setup or Edit layout.
   - **PPA** and **Cover** are staff-only boxes on the map. Use **Not in this period** in the tray for absence.
   - **Copy period to…** and **Copy day to…** repeat a period or a whole day elsewhere in the week.
   - <kbd>←</kbd> <kbd>→</kbd> change period. <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes and <kbd>Ctrl</kbd>+<kbd>Y</kbd> redoes. <kbd>Esc</kbd> clears a selection.
   - **Groups.** Set groups (the literacy and numeracy sets, D&D, the woods) are made in **Setup → Groups**: a name, the lesson, lessons a week, a usual room, a colour, and the pupils and staff, picked by clicking their names. Saved groups show as small cards with the pupils listed down them; **Edit** opens one. On the Plan, drag a group's card onto a room to move everyone in it who's in that period (the room takes the group's lesson if it has none), or tap it to pick them all up. To take a group out again, drag its coloured tag on the room back into the tray. Each shows how many of its lessons a week are planned, and a room with a group in it shows the group's name in its colour.
   - **The Lead teachers screen** (top bar) is for getting the main lessons in first, a teacher at a time. There is a page for the Literacy lead and the Numeracy lead to start with, and **+ Add a teacher** adds one for anyone else (pick the teacher and the subjects whose groups they take). Each page is the week with a column per day and a row per lesson, with that teacher's groups down the side. Each group's children are listed under it, in the list and on the week (anyone not with the group that lesson is faded). Drag a group onto a lesson to put it, and the teacher, in its usual room (or choose one). Drag it to another lesson to move it, or back to the list to take it out. Where the teacher is already somewhere else, the lesson says where. If a pupil is in two groups that would be on at once, it asks first. Drag the **PPA** chip under the groups onto the week to give the teacher PPA, and back off to remove it; the count shows how many they have against how many they need.
   - **Show alerts.** Warnings (groups left split, pupils short of a subject, rooms without staff, the list of things to check) are hidden until you tick **Show alerts**, on the Plan, Lead teachers, Week and Pupils screens, so they don't get in the way while planning. Ticking it on one screen shows them everywhere. The **Week** view lists any group short of its lessons.
   - **What each pupil needs.** The Pupils table in Setup has a column for each main subject (Numeracy, Literacy, Humanities, Biology, Science, Therapy, Expressive arts, DT, PE, Intervention; change them under "Subjects to check") with a – / 1 / 2 switch for how many a week each pupil needs. "All…" at the top of a column sets everyone. A tick shows it's planned, and "0/1" that it isn't yet; the Week view lists pupils who are short. A lesson counts if its name contains the subject.
4. **Use every space.** Switch the map from **People** to **Room use** (bottom right). Each room is shaded by how much of the week it has pupils in, and shows a small grid of its week: a row per day, a square per period. The tray lists the rooms least used first. Click a square to plan that period. Each place has a type in Setup: a learning space, a staff space (such as the office) or an off-site place. Only learning spaces count towards room use and free rooms.
5. **Check.** Each period in the strip shows ✓ when everyone is placed, a number for pupils not placed yet, and ! for a room with pupils but no staff. **Week** shows the whole week by room (which rooms are free when) or by person (each person's week in one row), with a list of things to check.
6. **Print.** **Timetables** makes a page for each pupil, member of staff or room, and whole-school sheets for each day. To email them, print to PDF.
   - **Generate timetables…** (on Timetables and Week) does a final check first: it lists what's still to sort out (pupils not placed, rooms, pupils short of a subject, groups short or split, staff PPA), and clicking one takes you to it. Then tick what to make (pupil timetables, picture timetables, staff timetables, day sheets to print, day sheets in Excel) and choose **Make them**: the ticked sets print together and the Excel downloads. It never changes the plan.
   - **Book** (the default for pupils) is the school's own design for their books: the school logo (choose it in Setup → Subjects), the pupil's name and "My weekly timetable" inside a green and gold frame, then the week with a symbol, the subject, *1:1*, *Paired* or *Group*, and the teacher in each lesson. Numeracy is orange, Champion time gold, other academic lessons purple and wellbeing lessons yellow, with no key. On a day pupils go home early (Friday at 2.40pm, set in Setup → The school day → Home early), Home time sits at the bottom of that day's last lesson. Each prints on its own A4 page with a wider margin on the right and bottom, to cut out with the guillotine. It uses the Lexend font if the computer has it.
   - **Pupils** are the timetables for their books, made straight from the plan, so nothing needs typing up. Each lesson shows the subject, then *1:1*, *Paired* or *Group* (never who with), then the teacher. The time sits in its own narrow shaded column, and a lesson that runs over two periods is one tall box. **Words** prints on A4 portrait. **Pictures** adds a symbol for each lesson (book, numbers, flask, ball, tree…) for pupils who find reading hard, on A4 landscape, with a photo of the teacher if you've added one.
   - Only staff ticked **Leads** in Setup → Staff are named; support staff are left off (if nobody in the room is ticked, everyone there is named). Rows for staff only, such as Prep and Meeting, are left off (untick **Pupils** for a row in Setup → The school day).
   - **Wellbeing** lessons are shaded pale green and **academic** lessons pale blue, on pupil timetables and day sheets, with a key. Setup → **Subjects** lists every subject on the timetable: change a subject's type there, or choose your own picture for it (such as the Widgit symbols your pupils already know) in place of the built-in symbol.
   - **Staff** timetables use the same layout as the pupils' with orange in place of blue. They include the staff-only rows, and each lesson shows the subject, the room and the pupils. PPA and Cover are written in, with the PPA count underneath.
   - **Rooms** gives a page per room with who is in it each period.
   - **Staff photos** are added in Setup → Staff. Photos and pictures stay in the browser on that computer and in your backup files.
   - **Days by staff** are the sugar-paper day sheets, printed as strips 10cm tall, two to an A3 page. **Days by room** lists each day room by room.

The map starts in the **school layout**: the floor plan's buildings and rooms in the same places, with the empty space taken out and rooms widened so a list of names fits. The Village Hall is on the left with the off-site places under it, then PPA and Cover, then the main building (its outline steps out round the Kitchen, as the real building does, with Pod 1 below) and Outdoors on the right. Each building has a name tab, each room an icon, and Learning Spaces 1–3 are drawn as one open-plan room with dashed walls between them. A plan saved on the earlier school layout moves to this one by itself the first time it opens, keeping everyone's places; Undo on the message puts the old layout back. **Setup → Change map layout** switches to the **exact-size** drawing and back; names, room types and everyone's places stay put. The off-site place called "Local village" can be renamed in Setup; the name stays on your computer. The tray sits above the map so the map uses the full width of the screen.

**Second screen** (top right) opens the **day sheet** in a new window. Drag it onto the other monitor and press <kbd>F</kbd> for full screen. It sets out one day the way the paper sugar-paper sheets do: the times and rows of the day down the side (lessons, plus coloured bands for Prep and Meeting, Wellbeing, Break, Lunch and Home time), and a column for each member of staff showing the subject in green, the teacher, and the pupils. It follows the day and period you're planning on the main screen, and updates as you move people. Clicking a cell shows that period on the main screen. Untick **Follow the main screen**, or use <kbd>←</kbd> <kbd>→</kbd>, to look at another day. **Print the week** prints the five days on A3, and **Export for Excel** saves them as a workbook with a tab per day in the same format (also in Setup → Export for Excel → Day sheets, and Timetables → Days by staff). The times and bands come from **Setup → The school day**: 8.30am Prep and Meeting (staff only), 9.00am Wellbeing, 9.45am Lesson 1, 10.45am Break, 11.05am Lesson 2, 12.00pm Lunch, 1.10pm Lesson 3, 2.10pm Lesson 4 and 3.10pm Home time, with home at 2.40pm on Fridays. A plan saved with the earlier times moves to these by itself.

**Full screen** (top right, or press <kbd>F</kbd>) hides the browser's bars and tightens the app around the map. <kbd>Esc</kbd> or <kbd>F</kbd> leaves it.

**Edit layout** (bottom right of the map) moves, resizes, renames, adds and removes rooms. To make the map look like the school, add a **floor plan picture** (a drawn site plan, or a photo of the fire evacuation plan) and drag the rooms onto it, draw **building outlines** behind the rooms (each with a name tab; the button above an outline changes its colour between building, Village Hall, off-site and outdoors), and place **labels** such as "West building" or "Yard". Double-click any name on the map to rename it. If you redraw the picture later, keep it the same shape and the rooms stay where they are. **Setup** also sets period names and times, and optional limits on how many pupils a room takes. You can also set how many PPA periods each member of staff needs, and the Week view warns when someone is short.

## Saving and backups

- Everything saves by itself **in the browser on that computer**. It is not shared between computers or browsers. Clearing browser data deletes it.
- **Save backup** downloads the whole plan as a `.json` file. The button shows a dot when there are changes since the last backup. To carry on on another computer, open the backup there with **Open a file…**.
- **Setup → Start a new half-term** keeps the rooms and people, and starts either from the current timetable or from an empty one.
- **Export for Excel** gives a CSV with one row per person per period, or one row per person with the week across.
- The first time it opens, the app offers to bring in a plan saved by the earlier map prototype on the same computer. That prototype had no days, so its P1–P4 placements go into Monday.

## Privacy

This repository is **public**. Pupils' names or initials, real staff names, staff photos, people lists, timetables from school and timetable backups must never be committed here. The example school uses invented names only. The app ships with the room layout only: people are added on the computer that uses it, and they stay in that browser and in your backup files. `.gitignore` blocks the default backup and export file names and a `private/` folder as a safety net.

## Running the tests

The test uses invented names. It needs Node and Playwright with Chromium:

```
NODE_PATH="$(npm root -g)" node tests/app.test.js [folder-for-screenshots]
```

## Not built yet

These came up in the brief and notes and are left for later: locking definite lessons, filling the rest of the timetable automatically, preferences between particular pupils and staff, and minimum outdoor time. The app is built so these can be added on top of the current plan without changing how it is saved.
