// Browser test for lifehouse-timetabler.html.
// Run:  NODE_PATH="$(npm root -g)" node tests/app.test.js [screenshot-folder]
// Uses invented names only. Never put real pupils' details in this repository.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const APP = 'file://' + path.resolve(__dirname, '..', 'lifehouse-timetabler.html');
const SHOTS = process.argv[2] || null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'timetabler-test-'));
const PEOPLE_CSV = path.join(TMP, 'people.csv');
fs.writeFileSync(PEOPLE_CSV, 'person_id,name,role\nS01,AB,student\nS02,CD,student\nS03,EF,student\nS04,GH,student\nT01,Alex,staff\nT02,Blake,staff\nT03,Casey,staff\n');

let failures = 0, passes = 0;
function check(ok, label) {
  if (ok) { passes++; console.log('  ok   ' + label); }
  else { failures++; console.log('  FAIL ' + label); }
}
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') });
}
async function center(loc) {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function dragTo(page, from, to, offsetY = 0) {
  await to.scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const a = await center(from);
  const b = await center(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
  await page.mouse.move(b.x, b.y + offsetY, { steps: 8 });
  await page.mouse.up();
}
const chipIn = (page, zone, name) => page.locator('[data-zone="' + zone + '"] .chip', { hasText: new RegExp('^' + name + '$') });
const roomPeople = (page, area) => page.locator('.room[data-area="' + area + '"] .room-people');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(APP);

  console.log('First open');
  check(await page.locator('.room').count() === 22, '22 rooms from the saved layout');
  check(await page.locator('.start-card').isVisible(), 'asks for pupils and staff');
  check(await page.locator('.strip-btn').count() === 20, '5 days x 4 periods in the strip');

  console.log('Open a people list');
  await page.setInputFiles('#file-open', PEOPLE_CSV);
  await page.waitForSelector('[data-zone="NONE"] .chip');
  check(await page.locator('[data-zone="NONE"] .chip').count() === 7, '7 people waiting to be placed');
  check(await page.locator('.strip-btn.empty').count() === 20, 'every period "not started"');

  console.log('Drag and drop with a mouse');
  await dragTo(page, chipIn(page, 'NONE', 'AB'), roomPeople(page, 'A15'));
  check(await chipIn(page, 'A15', 'AB').count() === 1, 'AB dragged into Science');
  check(await page.locator('.room[data-area="A15"].alert').count() === 1, 'Science flags "no staff"');
  check(await page.locator('.strip-btn.active.alert').count() === 1, 'Mon P1 shows the no-staff warning');
  await dragTo(page, chipIn(page, 'NONE', 'Alex'), roomPeople(page, 'A15'));
  check(await page.locator('.room[data-area="A15"].alert').count() === 0, 'warning clears once Alex is there');

  console.log('Tap to select, tap a room');
  await chipIn(page, 'NONE', 'CD').click();
  await chipIn(page, 'NONE', 'EF').click();
  check(await page.locator('.chip.sel').count() === 2, 'two names selected');
  await roomPeople(page, 'A12').click({ position: { x: 20, y: 30 } });
  check(await chipIn(page, 'A12', 'CD').count() === 1 && await chipIn(page, 'A12', 'EF').count() === 1, 'both moved into the Hall');
  check(await page.locator('.chip.sel').count() === 0, 'selection cleared after the move');

  console.log('PPA is staff only');
  await dragTo(page, chipIn(page, 'NONE', 'GH'), page.locator('[data-zone="PPA"]'));
  check(await chipIn(page, 'NONE', 'GH').count() === 1, 'pupil refused by PPA');
  await dragTo(page, chipIn(page, 'NONE', 'Blake'), page.locator('[data-zone="PPA"]'));
  check(await chipIn(page, 'PPA', 'Blake').count() === 1, 'Blake into PPA');
  await dragTo(page, chipIn(page, 'NONE', 'Casey'), roomPeople(page, 'A12'));
  await dragTo(page, chipIn(page, 'NONE', 'GH'), roomPeople(page, 'A12'));
  check(await page.locator('.strip-btn.active.done').count() === 1, 'Mon P1 complete');

  console.log('Lesson names');
  await page.fill('#lesson-A15', 'Maths');
  await page.fill('#lesson-A12', 'PE');
  await shot(page, '01-plan-1366');

  console.log('Copy a period to the same period every day');
  await page.getByRole('button', { name: 'Copy period to…' }).click();
  await page.getByRole('button', { name: 'Same period every day' }).click();
  await page.locator('dialog .btn.primary').click();
  check(await page.locator('.strip-btn.done').count() === 5, 'P1 complete on all five days');
  await page.locator('.strip-btn[aria-label^="Tuesday P1"]').click();
  check(await chipIn(page, 'A15', 'AB').count() === 1 && await page.inputValue('#lesson-A15') === 'Maths', 'Tuesday P1 has AB in Science doing Maths');

  console.log('Undo and redo');
  await page.locator('body').click({ position: { x: 5, y: 760 } });
  await page.keyboard.press('Control+z');
  check(await chipIn(page, 'A15', 'AB').count() === 0, 'undo takes the copy away again');
  await page.keyboard.press('Control+y');
  check(await chipIn(page, 'A15', 'AB').count() === 1, 'redo puts it back');

  console.log('Arrow keys move between periods');
  await page.keyboard.press('ArrowRight');
  check(await page.locator('.slot-name b').innerText() === 'Tuesday · P2', 'right arrow goes to Tuesday P2');

  console.log('Saved after a reload');
  await page.waitForTimeout(400);
  await page.reload();
  await page.locator('.strip-btn[aria-label^="Monday P1"]').click();
  check(await chipIn(page, 'A15', 'AB').count() === 1, 'AB still in Science after reload');
  check(await page.inputValue('#lesson-A12') === 'PE', 'lesson name kept');

  console.log('Backup and restore');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save backup' }).first().click()]);
  const backupPath = path.join(TMP, dl.suggestedFilename());
  await dl.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check(backup.app === 'lifehouse-timetabler' && backup.people.length === 7, 'backup holds the people');
  check(backup.slots['Fri|P1'] && backup.slots['Fri|P1'].at.S01 === 'A15', 'backup holds Friday P1');
  check(/^Lifehouse timetable backup - plan - \d{4}-\d\d-\d\d \d{4}\.json$/.test(dl.suggestedFilename()), 'backup file name: ' + dl.suggestedFilename());

  console.log('Export for Excel');
  await page.getByRole('button', { name: 'Setup' }).click();
  const [csv1] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Rows per period' }).click()]);
  const csvPath = path.join(TMP, 'a.csv');
  await csv1.saveAs(csvPath);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  check(csvText.charCodeAt(0) === 0xFEFF, 'CSV starts with a byte-order mark so Excel reads ’ correctly');
  const lines = csvText.trim().split('\r\n');
  check(lines.length === 1 + 5 * 4 * 7, 'one row per person per period (' + (lines.length - 1) + ')');
  check(lines.includes('Monday,P1,,Science,Maths,AB,,Pupil,Alex'), 'row for AB on Monday P1');
  const [csv2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Week grid' }).click()]);
  await csv2.saveAs(path.join(TMP, 'b.csv'));
  const grid = fs.readFileSync(path.join(TMP, 'b.csv'), 'utf8').trim().split('\r\n');
  check(grid[0].replace(/^\uFEFF/, '').startsWith('Name,Role,Mon P1,Mon P2') && grid.length === 8, 'week grid: header plus 7 people');

  console.log('Part-time days');
  await page.locator('.days-in[aria-label="GH days in"] button').nth(2).click();
  check(await page.locator('.days-in[aria-label="GH days in"] button.out').count() === 1, 'GH marked not in on Wednesday');
  await page.fill('#plan-name', 'Autumn 2 2026');
  await page.locator('.edit-table input[aria-label="Alex PPA periods a week"]').fill('2');

  console.log('Week view');
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  check(await page.locator('table.week tbody tr').count() === 24, 'a row for each room plus off-site and PPA');
  check(await page.getByText('Alex has 0 of 2 PPA periods').count() === 1, 'PPA shortfall listed');
  await shot(page, '02-week-room');
  await page.getByRole('button', { name: 'By person' }).click();
  check(await page.locator('td.out').count() === 4, 'GH shows "not in" for Wednesday’s 4 periods');
  await shot(page, '03-week-person');
  await page.locator('table.week td.place').first().click();
  check(await page.locator('.tab.on').innerText() === 'Plan', 'clicking a cell opens that period on the map');

  console.log('Timetables to print');
  await page.getByRole('button', { name: 'Timetables' }).click();
  check(await page.locator('.sheet').count() === 4, 'one page per pupil');
  check(await page.locator('.sheet').first().locator('.t').first().innerText() === 'Maths', 'AB’s Monday P1 says Maths');
  await shot(page, '04-print-pupils');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', landscape: true, preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  check(pages === 4, 'printing makes 4 A4 pages (' + pages + ')');
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'pupil-timetables.pdf'), pdf);
  await page.emulateMedia({ media: 'screen' });
  await page.locator('.print-controls .seg button', { hasText: 'Staff' }).click();
  check(await page.locator('.sheet').count() === 3, 'one page per member of staff');
  await page.locator('.print-controls .seg button', { hasText: 'Day sheets' }).click();
  check(await page.locator('.sheet').count() === 5, 'one day sheet per day');
  await shot(page, '05-print-day');

  console.log('Edit the layout');
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.getByRole('button', { name: 'Edit layout' }).click();
  const room = page.locator('.room[data-area="A15"]');
  const before = await room.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height - 12);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 - 60, before.y + before.height - 12 + 40, { steps: 6 });
  await page.mouse.up();
  const after = await room.boundingBox();
  check(Math.round(after.x - before.x) === -60 && Math.round(after.y - before.y) === 40, 'Science moved 60px left, 40px down');
  await page.locator('.room[data-area="A15"] .room-name').dblclick();
  await page.locator('.rename-pop').fill('Science Lab');
  await page.keyboard.press('Enter');
  check(await page.locator('.rename-pop').count() === 0 && await page.locator('.room[data-area="A15"] .room-name').innerText() === 'Science Lab', 'double-click a room name to rename it');
  await page.getByRole('button', { name: 'Done' }).click();
  check(await page.locator('.room[data-area="A15"] .room-name').innerText() === 'Science Lab', 'room renamed');

  check(errors.length === 0, 'no errors in the console' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();

  console.log('Bringing in the earlier version’s save');
  const old = {
    people: [{ id: 'S01', name: 'AB', role: 'student' }, { id: 'T01', name: 'Alex', role: 'staff' }],
    areas: [{ id: 'A1', name: 'Hall', x: 10, y: 10, w: 20, h: 20 }, { id: 'A2', name: 'Garden', x: 50, y: 10, w: 20, h: 20 }],
    lessonTitles: { P1: { A1: 'Drama' }, P2: {}, P3: {}, P4: {} },
    assignments: { P1: { unassigned: [], byArea: { A1: ['S01', 'T01'], A2: [] } }, P2: { unassigned: ['S01', 'T01'], byArea: {} }, P3: { unassigned: [], byArea: {} }, P4: { unassigned: [], byArea: {} } }
  };
  const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx2.addInitScript((o) => { if (!localStorage.getItem('lifehouse_timetabler_v2')) localStorage.setItem('lifehouse_map_v1', JSON.stringify(o)); }, old);
  const p2 = await ctx2.newPage();
  await p2.goto(APP);
  check(await p2.locator('dialog[open]').innerText().then((t) => t.includes('Bring in your earlier map')), 'offers to bring in the old save');
  await p2.getByRole('button', { name: 'Bring it in' }).click();
  check(await p2.locator('.room').count() === 2 && await p2.inputValue('#lesson-A1') === 'Drama', 'old rooms and lesson name on Monday P1');
  check(await chipIn(p2, 'A1', 'AB').count() === 1, 'old placement on Monday P1');
  await ctx2.close();

  console.log('Touch screens (dragging with a finger)');
  const ctx3 = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: false });
  const p3 = await ctx3.newPage();
  await p3.goto(APP);
  await p3.setInputFiles('#file-open', PEOPLE_CSV);
  await p3.waitForSelector('[data-zone="NONE"] .chip');
  const cdp = await ctx3.newCDPSession(p3);
  const a = await center(chipIn(p3, 'NONE', 'CD'));
  const b = await center(roomPeople(p3, 'A11'));
  const touch = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
  await touch('touchStart', a);
  for (let i = 1; i <= 10; i++) await touch('touchMove', { x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 });
  await touch('touchEnd');
  check(await chipIn(p3, 'A11', 'CD').count() === 1, 'CD dragged into the Literacy Lounge by touch');
  await p3.locator('[data-zone="NONE"] .chip', { hasText: 'EF' }).tap();
  await p3.locator('.room[data-area="A9"]').tap({ position: { x: 20, y: 60 } });
  check(await chipIn(p3, 'A9', 'EF').count() === 1, 'tap a name, tap the Woods');
  await ctx3.close();

  console.log('Example school, free rooms and room use');
  const ctx4 = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p4 = await ctx4.newPage();
  const err4 = [];
  p4.on('pageerror', (e) => err4.push(e.message));
  await p4.goto(APP);
  const roomNames = await p4.locator('.room .room-name').allInnerTexts();
  check(!roomNames.some((n) => /’s|'s/.test(n)), 'no room is named after a member of staff');
  check(await p4.locator('.room[data-area="A19"]').count() === 1, 'Office is on the map');
  await p4.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  check(await p4.locator('.chip.pupil').count() >= 18 && await p4.locator('.chip.staff').count() >= 20, 'example pupils and staff placed on Monday P1');
  check(await p4.locator('.strip-btn.done').count() >= 15, 'most example periods complete (' + await p4.locator('.strip-btn.done').count() + ')');
  check(await p4.locator('.strip-btn[aria-label^="Friday P4"]').evaluate((b) => b.classList.contains('todo') || b.classList.contains('alert')), 'Friday P4 left unfinished to show the checks');
  const freePills = await p4.locator('.free-rooms .room-pill').count();
  const freeOnMap = await p4.locator('.room.free').count();
  check(freePills > 0 && freePills === freeOnMap - 0 - (await p4.locator('.room.free[data-area="A19"], .room.free[data-area="A20"]').count()), 'free rooms listed match the map (' + freePills + ')');
  await shot(p4, '14-example-plan');
  await p4.locator('.map-tools .seg button', { hasText: 'Room use' }).click();
  check(await p4.locator('.room.use').count() === 22, 'room use view shows every room');
  check(await p4.locator('.room.use.staffonly').count() === 2, 'Office and Reception count as staff spaces');
  check(await p4.locator('.room.use.unused').count() + await p4.locator('.use-row').count() > 0, 'least-used list in the tray');
  const firstRow = await p4.locator('.use-row .use-n').first().innerText();
  const lastRow = await p4.locator('.use-row .use-n').last().innerText();
  check(+firstRow <= +lastRow, 'least used first (' + firstRow + ' … ' + lastRow + ')');
  await shot(p4, '15-room-use');
  await p4.locator('.room[data-area="A11"] .use-cell').nth(5).click();
  check(await p4.locator('.slot-name b').innerText() === 'Tuesday · P2' && await p4.locator('.room.use').count() === 0, 'clicking a square opens that period with people');
  await p4.getByRole('button', { name: 'Week', exact: true }).click();
  await p4.getByRole('button', { name: 'By room' }).click();
  check(await p4.locator('table.week thead th', { hasText: 'Pupils in' }).count() === 1, 'week by room has a pupils-in column');
  await shot(p4, '16-week-room-use');

  console.log('Example school keeps the loaded layout');
  await p4.getByRole('button', { name: 'Plan', exact: true }).click();
  await p4.getByRole('button', { name: 'Edit layout' }).click();
  await p4.getByRole('button', { name: 'Add a room' }).click();
  await p4.locator('.rename-pop').fill('Polytunnel');
  await p4.getByRole('button', { name: 'Done' }).click();
  check(await p4.locator('.editbar').count() === 0, 'Done works straight after renaming');
  await p4.getByRole('button', { name: 'Setup' }).click();
  await p4.getByRole('button', { name: 'Load the example…' }).click();
  await p4.getByRole('button', { name: 'Load example' }).click();
  check(await p4.locator('.room').count() === 23 && await p4.locator('.room .room-name', { hasText: 'Polytunnel' }).count() === 1, 'example school keeps the rooms on screen');

  console.log('Staff-only spaces');
  await p4.getByRole('button', { name: 'Setup' }).click();
  await p4.locator('input[aria-label="Pond room is a space for pupils"], input[aria-label="Little room is a space for pupils"]').first().uncheck();
  await p4.getByRole('button', { name: 'Plan', exact: true }).click();
  await p4.locator('.map-tools .seg button', { hasText: 'Room use' }).click();
  check(await p4.locator('.room.use.staffonly').count() === 3, 'Little room now a staff space');

  console.log('Floor plan picture and building outlines');
  const png = await p4.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 400); g.strokeStyle = '#333'; g.lineWidth = 6; g.strokeRect(20, 20, 360, 360); g.strokeRect(420, 20, 360, 360); return c.toDataURL('image/png').split(',')[1]; });
  const pngPath = path.join(TMP, 'plan.png');
  fs.writeFileSync(pngPath, Buffer.from(png, 'base64'));
  await p4.getByRole('button', { name: 'Edit layout' }).click();
  await p4.setInputFiles('#image-open', pngPath);
  await p4.waitForSelector('.plan-img');
  const mb = await p4.locator('#map').boundingBox();
  check(Math.abs(mb.width / mb.height - 2) < 0.02, 'map takes the picture’s shape (' + (mb.width / mb.height).toFixed(2) + ')');
  await p4.getByRole('button', { name: 'Add a building outline' }).click();
  await p4.locator('.rename-pop').fill('Main building');
  await p4.getByRole('button', { name: 'Add a label' }).click();
  await p4.locator('.rename-pop').fill('Yard');
  check(await p4.locator('.outline.label').count() === 1, 'label added');
  await shot(p4, '17-floor-plan-edit');
  await p4.getByRole('button', { name: 'Done' }).click();
  check(await p4.locator('.outline-name').innerText() === 'MAIN BUILDING' || await p4.locator('.outline-name').innerText() === 'Main building', 'outline named');
  await p4.waitForTimeout(400);
  await p4.reload();
  check(await p4.locator('.plan-img').count() === 1 && await p4.locator('.outline').count() === 2 && await p4.locator('.label-text').innerText() === 'YARD', 'picture, outline and label kept after reload');
  const [dl4] = await Promise.all([p4.waitForEvent('download'), p4.getByRole('button', { name: 'Save backup' }).click()]);
  const b4 = path.join(TMP, 'b4.json');
  await dl4.saveAs(b4);
  const j4 = JSON.parse(fs.readFileSync(b4, 'utf8'));
  check(/^data:image\/jpeg;base64,/.test(j4.map.image) && j4.map.w === 800 && j4.outlines.length === 2, 'backup carries the picture, outline and label');
  await p4.getByRole('button', { name: 'Edit layout' }).click();
  await p4.getByRole('button', { name: 'Add a room' }).click();
  check(await p4.locator('.room').count() === 24, 'room added on top of the picture');
  await p4.getByRole('button', { name: 'Done' }).click();
  await p4.keyboard.press('Control+z');
  check(await p4.locator('.room').count() === 23 && await p4.locator('.plan-img').count() === 1, 'undo removes the room and keeps the picture');
  check(err4.length === 0, 'no errors in the console' + (err4.length ? ': ' + err4.join(' | ') : ''));
  await ctx4.close();

  if (SHOTS) {
    console.log('Screenshots');
    for (const [name, opts] of [['06-plan-1920-dark', { viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' }], ['07-plan-1366-light', { viewport: { width: 1366, height: 768 } }]]) {
      const c = await browser.newContext(opts);
      const pg = await c.newPage();
      await pg.goto(APP);
      await pg.setInputFiles('#file-open', PEOPLE_CSV);
      await pg.waitForSelector('[data-zone="NONE"] .chip');
      await pg.evaluate((text) => {
        // Load the backup made earlier so the screenshot shows a filled-in period.
        const dt = new DataTransfer();
        dt.items.add(new File([text], 'backup.json', { type: 'application/json' }));
        const inp = document.querySelector('#file-open');
        inp.files = dt.files;
        inp.dispatchEvent(new Event('change'));
      }, fs.readFileSync(backupPath, 'utf8'));
      await pg.getByRole('button', { name: 'Open it' }).click();
      await pg.waitForTimeout(300);
      await pg.screenshot({ path: path.join(SHOTS, name + '.png') });
      await c.close();
    }
  }

  await browser.close();
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
