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
// Setup is in sections: open Setup, then the named section.
async function setupTo(pg, section) {
  await pg.getByRole('button', { name: 'Setup', exact: true }).click();
  await pg.locator('.setup-nav button', { hasText: section }).click();
}
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
  check(await page.locator('.room[data-area]').count() === 21, '21 places from the saved layout, including an off-site place');
  check(await page.locator('.room.special').count() === 2, 'PPA and Cover boxes on the map');
  const radii = await page.evaluate(() => [...document.querySelectorAll('button, .room, .chip, .zone, .strip-btn, input')].map((el) => getComputedStyle(el).borderTopLeftRadius).filter((r) => r !== '0px'));
  check(radii.length === 0, 'no rounded corners anywhere');
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
  await dragTo(page, chipIn(page, 'NONE', 'GH'), page.locator('[data-zone="COVER"]'));
  check(await chipIn(page, 'NONE', 'GH').count() === 1, 'pupil refused by Cover');
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
  await setupTo(page, 'Plan and files');
  const [csv1] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Rows per period' }).click()]);
  const csvPath = path.join(TMP, 'a.csv');
  await csv1.saveAs(csvPath);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  check(csvText.charCodeAt(0) === 0xFEFF, 'CSV starts with a byte-order mark so Excel reads ’ correctly');
  const lines = csvText.trim().split('\r\n');
  check(lines.length === 1 + 5 * 4 * 7, 'one row per person per period (' + (lines.length - 1) + ')');
  check(lines.includes('Monday,P1,,Science Room,Maths,AB,,Pupil,Alex'), 'row for AB on Monday P1');
  const [csv2] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Week grid' }).click()]);
  await csv2.saveAs(path.join(TMP, 'b.csv'));
  const grid = fs.readFileSync(path.join(TMP, 'b.csv'), 'utf8').trim().split('\r\n');
  check(grid[0].replace(/^\uFEFF/, '').startsWith('Name,Role,Mon P1,Mon P2') && grid.length === 8, 'week grid: header plus 7 people');

  console.log('Part-time days');
  await page.locator('.setup-nav button', { hasText: 'Pupils' }).click();
  await page.locator('.days-in[aria-label="GH days in"] button').nth(2).click();
  check(await page.locator('.days-in[aria-label="GH days in"] button.out').count() === 1, 'GH marked not in on Wednesday');
  await page.locator('.setup-nav button', { hasText: 'Plan and files' }).click();
  await page.fill('#plan-name', 'Autumn 2 2026');
  await page.locator('.setup-nav button', { hasText: 'Staff' }).click();
  await page.locator('.edit-table input[aria-label="Alex PPA periods a week"]').fill('2');

  console.log('Week view');
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  check(await page.locator('table.week tbody tr').count() === 23, 'a row for each place plus PPA and Cover');
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
  check(await page.locator('.sheet').first().locator('.pt-subject').first().innerText() === 'Maths', 'AB’s Monday P1 says Maths');
  await shot(page, '04-print-pupils');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', landscape: true, preferCSSPageSize: true });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  check(pages === 4, 'printing makes 4 A4 pages (' + pages + ')');
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'pupil-timetables.pdf'), pdf);
  await page.emulateMedia({ media: 'screen' });
  await page.locator('.print-controls .seg button', { hasText: /^Staff$/ }).click();
  check(await page.locator('.sheet').count() === 3, 'one page per member of staff');
  await page.locator('.print-controls .seg button', { hasText: 'Days by room' }).click();
  check(await page.locator('.sheet').count() === 5, 'one day sheet per day');
  await shot(page, '05-print-day');
  await page.locator('.print-controls .seg button', { hasText: 'Days by staff' }).click();
  check(await page.locator('.sheet.staffday').count() === 5 && await page.locator('.sheet.staffday').first().locator('thead th').count() === 5, 'days by staff: a sheet per day, a column per member of staff');

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
  check(Math.round(after.x - before.x) === -60 && Math.round(after.y - before.y) === 40, 'Science moved 60px left, 40px down (' + Math.round(after.x - before.x) + ', ' + Math.round(after.y - before.y) + ')');
  await page.locator('.room[data-area="A15"] .room-name').dblclick();
  await page.locator('.rename-pop').fill('Science Lab');
  await page.keyboard.press('Enter');
  check(await page.locator('.rename-pop').count() === 0 && await page.locator('.room[data-area="A15"] .room-name').innerText() === 'Science Lab', 'double-click a room name to rename it');
  await page.getByRole('button', { name: 'Done' }).click();
  check(await page.locator('.room[data-area="A15"] .room-name').innerText() === 'Science Lab', 'room renamed');

  check(errors.length === 0, 'no errors in the console' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();

  console.log('Off-site places');
  const ctx5 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p5 = await ctx5.newPage();
  await p5.addInitScript(() => {
    if (localStorage.getItem('lifehouse_timetabler_v2')) return;
    localStorage.setItem('lifehouse_timetabler_v2', JSON.stringify({ app: 'lifehouse-timetabler', version: 2, name: 'old', people: [{ id: 'S01', name: 'AB', role: 'student' }, { id: 'T01', name: 'Alex', role: 'staff' }],
      areas: [{ id: 'A1', name: 'Hall', x: 10, y: 10, w: 20, h: 20 }], slots: { 'Mon|P1': { titles: { OFF: 'Swimming' }, at: { S01: 'OFF', T01: 'OFF' } } } }));
  });
  await p5.goto(APP);
  const offRoom = p5.locator('.room.offsite');
  check(await offRoom.count() === 1 && await offRoom.locator('.room-name').innerText() === 'Other off-site', 'old Off-site placements move to an "Other off-site" place');
  check(await offRoom.locator('.chip').count() === 2 && await offRoom.locator('.room-lesson').inputValue() === 'Swimming', 'with the people and the activity');
  await p5.getByRole('button', { name: 'Edit layout' }).click();
  await p5.getByRole('button', { name: 'Add an off-site place' }).click();
  await p5.locator('.rename-pop').fill('Leisure centre');
  await p5.keyboard.press('Enter');
  await p5.getByRole('button', { name: 'Done' }).click();
  check(await p5.locator('.room.offsite').count() === 2 && await p5.locator('.room.offsite .room-name', { hasText: 'Leisure centre' }).count() === 1, 'new off-site place added and named');
  await p5.getByRole('button', { name: 'Week', exact: true }).click();
  check(await p5.locator('table.week tbody th', { hasText: 'Leisure centre (off-site)' }).count() === 1, 'off-site places listed in the week by room');
  await ctx5.close();

  console.log('A browser still holding the earlier built-in layout');
  const ctx6 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p6 = await ctx6.newPage();
  await p6.addInitScript(() => {
    if (localStorage.getItem('upgraded-test')) return;
    localStorage.setItem('upgraded-test', '1');
    localStorage.setItem('lifehouse_timetabler_v2', JSON.stringify({ app: 'lifehouse-timetabler', version: 2, name: 'Spring 1', people: [], slots: {},
      areas: [{ id: 'A1', name: 'Central Learning Space', x: 42, y: 41, w: 6, h: 24 }, { id: 'A2', name: 'Creation Station', x: 50, y: 21, w: 6, h: 20 }] }));
  });
  await p6.goto(APP);
  check(await p6.locator('.room .room-name', { hasText: 'Brook Room' }).count() === 1 && await p6.locator('.room .room-name', { hasText: 'Central Learning Space' }).count() === 0, 'opens on the school layout instead');
  check(await p6.locator('.plan-name').innerText() === 'Spring 1', 'and keeps the plan name');
  await ctx6.close();

  console.log('Full screen and map layouts');
  const ctx7 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p7 = await ctx7.newPage();
  await p7.goto(APP);
  await p7.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  const roomy = await p7.locator('.room[data-area="A1"]').boundingBox();
  check(roomy.width > 120 && roomy.height > 110, 'Learning Space 3 is big enough for a list of names (' + Math.round(roomy.width) + '×' + Math.round(roomy.height) + ')');
  const mapBefore = await p7.locator('#map').boundingBox();
  await p7.getByRole('button', { name: 'Full screen' }).click();
  check(await p7.evaluate(() => document.body.classList.contains('fs')), 'full screen mode on');
  await p7.waitForTimeout(250);
  const mapAfter = await p7.locator('#map').boundingBox();
  check(mapAfter.height > mapBefore.height && mapAfter.width > mapBefore.width, 'the map gets bigger in full screen (' + Math.round(mapBefore.height) + ' → ' + Math.round(mapAfter.height) + ' high)');
  await shot(p7, '18-full-screen');
  await p7.keyboard.press('f');
  check(await p7.evaluate(() => !document.body.classList.contains('fs')), 'F leaves full screen');
  const inLs3 = await p7.locator('.room[data-area="A1"] .chip').count();
  await setupTo(p7, 'Rooms and map');
  await p7.getByRole('button', { name: 'Change map layout…' }).click();
  await p7.locator('input[name="layout-pick"][value="scale"]').check();
  await p7.getByRole('button', { name: 'Use this layout' }).click();
  await p7.getByRole('button', { name: 'Plan', exact: true }).click();
  check(await p7.locator('.plan-img').count() === 1 && await p7.locator('.room[data-area="A1"] .chip').count() === inLs3, 'to-scale layout keeps everyone in place');
  await p7.reload();
  check(await p7.locator('.plan-img').count() === 1, 'a chosen to-scale layout stays after reload');
  await ctx7.close();

  console.log('A plan on the previous to-scale standard');
  const ctx8 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p8 = await ctx8.newPage();
  await p8.goto(APP);
  await p8.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  await p8.evaluate(() => localStorage.removeItem('lifehouse_timetabler_ui'));
  await setupTo(p8, 'Rooms and map');
  await p8.getByRole('button', { name: 'Change map layout…' }).click();
  await p8.locator('input[name="layout-pick"][value="scale"]').check();
  await p8.getByRole('button', { name: 'Use this layout' }).click();
  await p8.evaluate(() => localStorage.removeItem('lifehouse_timetabler_ui'));
  await p8.waitForTimeout(400);
  await p8.reload();
  await p8.getByRole('button', { name: 'Plan', exact: true }).click();
  check(await p8.locator('.plan-img').count() === 0 && await p8.locator('#map .chip').count() > 20, 'moves to the roomy layout by itself, keeping placements');
  await p8.getByRole('button', { name: 'Undo' }).first().click();
  check(await p8.locator('.plan-img').count() === 1, 'undo puts the to-scale plan back');
  await ctx8.close();

  console.log('Second screen: the day sheet');
  const ctx10 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const p10 = await ctx10.newPage();
  const err10 = [];
  p10.on('pageerror', (e) => err10.push(e.message));
  await p10.goto(APP);
  await p10.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  await p10.waitForTimeout(400);
  const [sheet] = await Promise.all([p10.waitForEvent('popup'), p10.getByRole('button', { name: 'Second screen' }).click()]);
  sheet.on('pageerror', (e) => err10.push('second screen: ' + e.message));
  await sheet.setViewportSize({ width: 1920, height: 1080 });
  await sheet.waitForSelector('.dgrid');
  check(await sheet.locator('.dg-head').count() === 23, 'a column for each member of staff');
  check(await sheet.locator('.dg-band').count() === 6 && await sheet.locator('.dg-band', { hasText: 'Learners Arrive' }).count() === 1, 'the rest of the day shows as coloured rows');
  check(await sheet.locator('.dg-label').allInnerTexts().then((t) => t.join('|')) === 'Lesson 1|Lesson 2|Lesson 3|Lesson 4', 'four lessons in time order');
  const gridBox = await sheet.locator('.dgrid').boundingBox();
  check(gridBox.width <= 1920 && gridBox.height <= 1080, 'fits a 1920×1080 screen');
  const abi = await sheet.locator('.dg-cell').first().innerText();
  check(abi.length > 0, 'cells show the place and pupils (' + abi.replace(/\n/g, ' / ') + ')');
  await shot(sheet, '20-second-screen');
  await p10.locator('.strip-btn[aria-label^="Wednesday P3"]').click();
  await sheet.waitForTimeout(1800);
  check(await sheet.locator('.tab.on').innerText() === 'Wednesday' && await sheet.locator('.dg-label.now').innerText() === 'Lesson 3', 'follows the day and period on the main screen');
  await p10.locator('.room[data-area="A11"] .room-lesson').fill('Spelling');
  await sheet.waitForTimeout(1800);
  check(/Spelling/.test(await sheet.locator('.dg-cell.k-place[title^="Spelling"]').first().getAttribute('title') || ''), 'picks up changes made on the main screen');
  await sheet.locator('.dg-cell.k-place').nth(2).click();
  await p10.waitForTimeout(400);
  check(/^Wednesday · P1$/.test(await p10.locator('.slot-name b').innerText()), 'clicking a cell shows that period on the main screen');
  await sheet.getByRole('tab', { name: 'Friday' }).click().catch(() => sheet.getByRole('button', { name: 'Friday' }).click());
  check(await sheet.locator('.tab.on').innerText() === 'Friday' && !(await sheet.locator('#sheet-follow').isChecked()), 'choosing a day stops following');
  const [xl] = await Promise.all([sheet.waitForEvent('download'), sheet.getByRole('button', { name: 'Export for Excel' }).click()]);
  const xlPath = path.join(TMP, 'days.xlsx');
  await xl.saveAs(xlPath);
  const zip = fs.readFileSync(xlPath);
  check(zip.slice(0, 2).toString() === 'PK' && /\.xlsx$/.test(xl.suggestedFilename()) && ['Monday', 'Friday', 'Learners Arrive'].every((w) => zip.includes(w)), 'Excel workbook with a tab per day');
  check(await sheet.evaluate(() => localStorage.getItem('lifehouse_timetabler_v2')) === await p10.evaluate(() => localStorage.getItem('lifehouse_timetabler_v2')), 'the second screen never changes the plan');
  check(err10.length === 0, 'no errors in either window' + (err10.length ? ': ' + err10.join(' | ') : ''));

  console.log('Pupil timetables for their books');
  await p10.getByRole('button', { name: 'Timetables' }).click();
  await p10.locator('#print-who').selectOption({ label: 'KB' });
  const kb = p10.locator('.sheet.pupil');
  const kbText = await kb.innerText();
  const others = ['AB', 'CD', 'DR', 'FT', 'GW', 'HM', 'JP', 'LR', 'MO', 'NP', 'OT', 'PJ', 'RS', 'SB', 'TW', 'VH', 'WP', 'YA', 'ZK', 'BM'];
  check(!others.some((n) => new RegExp('\\b' + n + '\\b').test(kbText)), 'a pupil’s timetable never names the other pupils');
  check(await kb.locator('.pt-group').count() > 0 && (await kb.locator('.pt-group').allInnerTexts()).every((t) => ['1:1', 'Paired', 'Group'].includes(t)), 'says 1:1, Paired or Group instead');
  check(await kb.locator('.pt-teacher').count() > 0 && await kb.locator('.pt-name').innerText() === 'KB', 'subject, then the teacher, under the pupil’s name');
  check(await kb.locator('thead th').nth(1).innerText() === 'Time' && await kb.locator('.pt-when').count() === 9, 'times sit in their own narrow column, not like a day');
  check(!/Prep and Meeting/.test(kbText) && /Learners Arrive/.test(kbText), 'staff-only rows are left off pupil timetables');
  await p10.getByRole('button', { name: 'Pictures' }).click();
  check(await p10.locator('.sheet.pupil.pictures .pt-lesson .pt-ic').count() >= 15, 'the picture version has a symbol for each lesson');
  await p10.emulateMedia({ media: 'print' });
  const kbPdf = await p10.pdf({ preferCSSPageSize: true });
  check((kbPdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === 1, 'the picture timetable fits one A4 page');
  await p10.emulateMedia({ media: 'screen' });
  await p10.locator('.print-controls .seg button', { hasText: 'Days by staff' }).click();
  await p10.emulateMedia({ media: 'print' });
  const stripPdf = await p10.pdf({ preferCSSPageSize: true });
  check((stripPdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === 3, 'day sheets print as strips, two to an A3 page');
  await p10.emulateMedia({ media: 'screen' });

  console.log('Staff photos, lead staff, the school’s own pictures and lesson types');
  const picFile = path.join(TMP, 'pic.png');
  fs.writeFileSync(picFile, Buffer.from(await p10.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 300, 200); return c.toDataURL('image/png').split(',')[1]; }), 'base64'));
  await setupTo(p10, 'Staff');
  await p10.getByRole('checkbox', { name: 'Abi leads lessons' }).check();
  const [fc1] = await Promise.all([p10.waitForEvent('filechooser'), p10.getByRole('button', { name: 'Add a photo of Abi' }).click()]);
  await fc1.setFiles(picFile);
  await p10.waitForSelector('.photo-btn img');
  await p10.locator('.setup-nav button', { hasText: 'Subjects' }).click();
  const [fc2] = await Promise.all([p10.waitForEvent('filechooser'), p10.getByRole('button', { name: 'Choose a picture for Animal care' }).click()]);
  await fc2.setFiles(picFile);
  await p10.getByRole('button', { name: 'Change the picture for Animal care' }).waitFor();
  check(await p10.locator('select[aria-label="Animal care type"]').inputValue() === 'wellbeing' && await p10.locator('select[aria-label="Phonics type"]').inputValue() === 'academic', 'lesson types guessed from the name');
  await p10.locator('select[aria-label="Phonics type"]').selectOption('wellbeing');
  await p10.getByRole('button', { name: 'Timetables' }).click();
  await p10.locator('.print-controls .seg button', { hasText: /^Pupils$/ }).click();
  await p10.locator('#print-who').selectOption({ label: 'KB' });
  await p10.getByRole('button', { name: 'Words' }).click();
  const kbTeachers = await p10.locator('.sheet.pupil .pt-teacher').allInnerTexts();
  check(kbTeachers.includes('Abi') && !kbTeachers.some((t) => /Abi,|, Abi/.test(t)), 'only the member of staff leading is named when Abi is in the room (' + kbTeachers.filter((t) => /Abi/.test(t)).join('; ') + ')');
  const shade = async (subject) => p10.locator('.sheet.pupil td', { has: p10.locator('.pt-subject', { hasText: new RegExp('^' + subject + '$') }) }).first().evaluate((td) => td.className);
  check(/lt-wellbeing/.test(await shade('Animal care')) && /lt-academic/.test(await shade('English')) && /lt-wellbeing/.test(await shade('Phonics')), 'wellbeing lessons green, academic blue, as chosen');
  check(await p10.locator('.sheet.pupil .pt-key').innerText().then((t) => /Wellbeing lessons/.test(t) && /Academic lessons/.test(t)), 'a key explains the colours');
  await p10.getByRole('button', { name: 'Pictures' }).click();
  check(await p10.locator('.sheet.pupil img.pt-img').count() >= 1 && await p10.locator('.sheet.pupil img.pt-photo').count() >= 1, 'picture timetable uses the school’s picture and Abi’s photo');
  await p10.waitForTimeout(400);
  const [bk] = await Promise.all([p10.waitForEvent('download'), p10.getByRole('button', { name: 'Save backup' }).click()]);
  const bkPath = path.join(TMP, 'photos.json');
  await bk.saveAs(bkPath);
  const bj = JSON.parse(fs.readFileSync(bkPath, 'utf8'));
  check(/^data:image\/jpeg/.test((bj.people.find((x) => x.name === 'Abi') || {}).photo || '') && /^data:image\/png/.test(bj.symbols['animal care'] || '') && bj.subjectTypes.phonics === 'wellbeing', 'the backup carries the photo, the picture and the lesson types');
  await p10.reload();
  await p10.getByRole('button', { name: 'Timetables' }).click();
  check(await p10.locator('.sheet.pupil img.pt-photo').count() >= 1, 'and they are still there after a reload');

  console.log('The school day');
  await setupTo(p10, 'School day');
  await p10.getByRole('button', { name: 'Add a row (break, lunch…)' }).click();
  const newRow = p10.locator('input[aria-label="Name of the  row"]');
  await newRow.fill('Assembly');
  await p10.locator('input[aria-label="New row time"]').fill('9.30am');
  await p10.locator('input[aria-label="New row time"]').blur();
  await p10.waitForTimeout(400);
  const order = await p10.locator('input[aria-label^="Name of the"]').evaluateAll((els) => els.map((e) => e.value));
  check(order.indexOf('Assembly') === order.indexOf('Wellbeing') + 1, 'a new row goes in time order (' + order.join(', ') + ')');
  await sheet.getByRole('button', { name: 'Monday' }).click();
  await sheet.waitForTimeout(1800);
  check(await sheet.locator('.dg-band', { hasText: 'Assembly' }).count() === 1, 'and shows on the second screen');
  await ctx10.close();

  console.log('Groups');
  const ctx11 = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const p11 = await ctx11.newPage();
  const err11 = [];
  p11.on('pageerror', (e) => err11.push(e.message));
  await p11.goto(APP);
  await p11.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  const dragBox = async (from, to) => {
    const a = await from.boundingBox(), z = await to.boundingBox();
    await p11.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p11.mouse.down();
    for (let i = 1; i <= 8; i++) await p11.mouse.move(a.x + a.width / 2 + (z.x + z.width / 2 - a.x - a.width / 2) * i / 8, a.y + a.height / 2 + (z.y + z.height / 2 - a.y - a.height / 2) * i / 8);
    await p11.mouse.up();
    await p11.waitForTimeout(150);
  };
  // Setup: make a group by clicking names
  await setupTo(p11, 'Groups');
  check(await p11.locator('.gcard').count() === 6, 'the example has its set groups');
  await p11.getByRole('button', { name: 'Add a group' }).click();
  const card = p11.locator('.gcard').last();
  await card.locator('input[aria-label="Group name"]').fill('Spelling group');
  await card.locator('input[aria-label$=" lesson"]').fill('Spelling');
  await p11.waitForTimeout(100);
  await setupTo(p11, 'Groups');
  const card2 = p11.locator('.gcard').last();
  await card2.locator('button[title="Add AB to Spelling group"]').click();
  await p11.locator('.gcard').last().locator('button[title="Add CD to Spelling group"]').click();
  check(await p11.locator('.gcard').last().locator('.chip[aria-pressed="true"]').count() === 2, 'members chosen by clicking their names');
  // Plan: drag a group onto a room
  await p11.getByRole('button', { name: 'Plan', exact: true }).click();
  await p11.getByRole('button', { name: 'Clear period' }).click();
  await p11.locator('dialog .btn.primary').click();
  const lit1 = p11.locator('.groups-zone .gchip', { hasText: 'Literacy set 1' });
  await dragBox(lit1, p11.locator('.room[data-area="A1"] .room-people'));
  check(await p11.locator('.room[data-area="A1"] .chip').count() === 6, 'dragging a group moves everyone in it (' + await p11.locator('.room[data-area="A1"] .chip').count() + ')');
  check(await p11.inputValue('#lesson-A1') === 'Literacy', 'and the room gets the group’s lesson');
  check(await p11.locator('.groups-zone .gchip', { hasText: 'Literacy set 1' }).locator('.gchip-at').innerText() === '✓ Learning Space 3', 'the group shows where it is');
  await p11.locator('.groups-zone .gchip', { hasText: 'Literacy set 2' }).click();
  check(await p11.locator('.chip.sel').count() >= 6, 'tapping a group picks everyone up');
  await p11.locator('.room[data-area="A15"]').click({ position: { x: 30, y: 60 } });
  check(await p11.locator('.room[data-area="A15"] .chip').count() === 6, 'then tapping a room puts them there');
  // The Groups screen
  await p11.getByRole('button', { name: 'Groups', exact: true }).first().click();
  check(await p11.locator('.seg button.on').innerText() === 'Literacy' && await p11.locator('table.gweek thead th').count() === 6, 'the Groups screen: literacy first, a column per day');
  check(await p11.locator('td[data-cell="Mon|P1"] .gchip', { hasText: 'Literacy set 1' }).count() === 1, 'shows where groups already are');
  await dragBox(p11.locator('.gw-tray .gchip', { hasText: 'Literacy set 1' }), p11.locator('td[data-cell="Tue|P2"]'));
  check(await p11.locator('td[data-cell="Tue|P2"] .gchip', { hasText: 'Literacy set 1' }).count() === 1 && /2\/2/.test(await p11.locator('.gw-tray .gchip', { hasText: 'Literacy set 1' }).innerText()), 'drag a group onto the week; it counts towards its lessons');
  await dragBox(p11.locator('td[data-cell="Tue|P2"] .gchip', { hasText: 'Literacy set 1' }), p11.locator('td[data-cell="Thu|P3"]'));
  check(await p11.locator('td[data-cell="Tue|P2"] .gchip').count() === 0 && await p11.locator('td[data-cell="Thu|P3"] .gchip', { hasText: 'Literacy set 1' }).count() === 1, 'drag it to another lesson to move it');
  await dragBox(p11.locator('td[data-cell="Thu|P3"] .gchip', { hasText: 'Literacy set 1' }), p11.locator('.gw-tray'));
  check(await p11.locator('td[data-cell="Thu|P3"] .gchip').count() === 0, 'or back to the list to take it out');
  await p11.locator('.seg button', { hasText: 'Numeracy' }).click();
  await dragBox(p11.locator('.gw-tray .gchip', { hasText: 'Numeracy set 1' }), p11.locator('td[data-cell="Mon|P1"]'));
  check(await p11.locator('dialog').innerText().then((t) => /Clash/.test(t) && /AB is also in Literacy set 1/.test(t)), 'asks before splitting another group');
  await p11.getByRole('button', { name: 'Move them anyway' }).click();
  await p11.locator('.seg button', { hasText: 'Literacy' }).click();
  check(/Literacy set 1: AB elsewhere/.test((await p11.locator('td[data-cell="Mon|P1"] .gw-split').allInnerTexts()).join(' ')), 'the split group is flagged');
  await p11.locator('.seg button', { hasText: 'D&D' }).click();
  await p11.locator('.gw-tray .gchip', { hasText: 'D&D' }).click();
  await p11.locator('td[data-cell="Fri|P4"]').click();
  check(await p11.locator('dialog').innerText().then((t) => /Which room for D&D/.test(t)), 'tap a group then a lesson; with no usual room it asks which');
  await p11.locator('dialog input[name="gw-room"]').nth(2).check();
  await p11.getByRole('button', { name: 'Put it there' }).click();
  check(await p11.locator('td[data-cell="Fri|P4"] .gchip', { hasText: 'D&D' }).count() === 1, 'and puts it there');
  await p11.getByRole('button', { name: 'Week', exact: true }).click();
  check(await p11.getByText(/Literacy set 1 has [01] of 2 lessons this week/).count() === 1, 'the Week view lists groups short of their lessons');
  check(err11.length === 0, 'no errors' + (err11.length ? ': ' + err11.join(' | ') : ''));
  await ctx11.close();

  console.log('Map style: Navy plan');
  const ctx9 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p9 = await ctx9.newPage();
  await p9.goto(APP);
  await p9.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  const top = await p9.locator('#topbar').evaluate((el) => getComputedStyle(el).backgroundColor);
  check(top === 'rgb(21, 35, 58)', 'navy top bar (' + top + ')');
  check(await p9.locator('.outline-name', { hasText: 'Main building' }).count() === 1 && await p9.locator('.outline-name', { hasText: 'Village Hall' }).count() === 1 && await p9.locator('.outline.t-out .outline-name', { hasText: 'Outdoors' }).count() === 1, 'buildings named by tabs');
  check(await p9.locator('.walls path').count() === 4, 'one wall per building or group (' + await p9.locator('.walls path').count() + ')');
  const mainWall = await p9.locator('.walls path.t-main').getAttribute('d');
  check((mainWall.match(/M/g) || []).length > 4, 'the main building steps out round the Kitchen, not a plain box');
  const icons = await p9.locator('.room[data-area] .room-head .room-ic').count();
  check(icons === 21 && await p9.locator('.room.special .room-ic').count() === 2, 'every room has an icon (' + icons + ')');
  check(await p9.locator('.room[data-area="A1"]').evaluate((el) => el.classList.contains('open-t') && el.classList.contains('open-b')), 'Learning Space 3 shares dashed walls with LS2 and LS1');
  check(await p9.locator('.room[data-area="A22"]').evaluate((el) => !/open-/.test(el.className)), 'Brook Room has solid walls');
  check(await p9.locator('.room.t-out').count() === 3 && await p9.locator('.room.offsite.alone').count() === 0, 'outdoor and off-site places take their group’s look');
  const k = await p9.locator('.room[data-area="A6"]').boundingBox(), l3 = await p9.locator('.room[data-area="A1"]').boundingBox();
  check(Math.abs(k.x + k.width - l3.x) < 2 && Math.abs(k.y - l3.y) < 2, 'Kitchen touches Learning Space 3');
  const pod = await p9.locator('.room[data-area="A13"]').boundingBox();
  check(pod.height > 120, 'Pod 1 is tall enough for names (' + Math.round(pod.height) + ')');
  await shot(p9, '19-navy-plan');

  console.log('A plan on the earlier school layout');
  await p9.waitForTimeout(400);
  await p9.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('lifehouse_timetabler_v2'));
    d.outlines = [{ id: 'B1', kind: 'box', name: '', x: 0.21, y: 21.39, w: 36.81, h: 35 }, { id: 'B2', kind: 'box', name: 'Main building', x: 40.11, y: 13.06, w: 53.03, h: 86.39 }, { id: 'B6', kind: 'label', name: 'Off-site', x: 0.53, y: 57.22, w: 36.7, h: 4.17 }];
    const kit = d.areas.find((a) => a.id === 'A6'); Object.assign(kit, { x: 40.43, y: 40.28, w: 7.71, h: 18.06 });
    d.areas.forEach((a) => { delete a.open; });
    localStorage.setItem('lifehouse_timetabler_v2', JSON.stringify(d));
  });
  await p9.reload();
  check(await p9.locator('.room[data-area="A6"]').evaluate((el) => el.style.left) === '46.81%' && await p9.locator('.walls path').count() === 4, 'moves to the new look by itself');
  check(await p9.locator('#map .chip').count() > 20 && await p9.locator('.room[data-area="A2"].open-b').count() === 1, 'keeps everyone, and the learning spaces are open plan');
  await p9.getByRole('button', { name: 'Undo' }).first().click();
  check(await p9.locator('.room[data-area="A6"]').evaluate((el) => el.style.left) === '40.43%', 'undo puts the old layout back');
  await p9.waitForTimeout(400);
  await p9.reload();
  check(await p9.locator('.room[data-area="A6"]').evaluate((el) => el.style.left) === '40.43%', 'and it stays back after a reload');
  await ctx9.close();

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
  check(await p2.locator('.room[data-area]').count() === 2 && await p2.inputValue('#lesson-A1') === 'Drama', 'old rooms and lesson name on Monday P1');
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
  check(await p4.locator('.room[data-area="A19"], .room[data-area="A20"]').count() === 0, 'Office and Reception are left out of the standard map');
  await p4.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  check(await p4.locator('.chip.pupil').count() >= 18 && await p4.locator('.chip.staff').count() >= 20, 'example pupils and staff placed on Monday P1');
  check(await p4.locator('.strip-btn.done').count() >= 15, 'most example periods complete (' + await p4.locator('.strip-btn.done').count() + ')');
  check(await p4.locator('.strip-btn[aria-label^="Friday P4"]').evaluate((b) => b.classList.contains('todo') || b.classList.contains('alert')), 'Friday P4 left unfinished to show the checks');
  const freePills = await p4.locator('.free-rooms .room-pill').count();
  const freeOnMap = await p4.locator('.room.free[data-area]:not(.offsite):not(.staffspace)').count();
  check(freePills > 0 && freePills === freeOnMap, 'free rooms listed match the map (' + freePills + ')');
  await shot(p4, '14-example-plan');
  await p4.locator('.map-tools .seg button', { hasText: 'Room use' }).click();
  check(await p4.locator('.room.use').count() === 21, 'room use view shows every room');
  check(await p4.locator('.room.use.offsite').count() === 4, 'off-site places shown separately in room use');
  check(await p4.locator('.room.use.staffonly').count() === 0, 'no staff spaces on the standard map');
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
  await p4.locator('.rename-pop').fill('Tool shed');
  await p4.getByRole('button', { name: 'Done' }).click();
  check(await p4.locator('.editbar').count() === 0, 'Done works straight after renaming');
  await setupTo(p4, 'Plan and files');
  await p4.getByRole('button', { name: 'Load the example…' }).click();
  await p4.getByRole('button', { name: 'Load example' }).click();
  check(await p4.locator('.room[data-area]').count() === 22 && await p4.locator('.room .room-name', { hasText: 'Tool shed' }).count() === 1, 'example school keeps the rooms on screen');

  console.log('Staff-only spaces');
  await setupTo(p4, 'Rooms and map');
  await p4.locator('select[aria-label="Small Room type"]').selectOption('staff');
  await p4.getByRole('button', { name: 'Plan', exact: true }).click();
  await p4.locator('.map-tools .seg button', { hasText: 'Room use' }).click();
  check(await p4.locator('.room.use.staffonly').count() === 1, 'Small Room now a staff space');

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
  await p4.locator('.rename-pop').fill('Garden shed');
  await p4.getByRole('button', { name: 'Add a label' }).click();
  await p4.locator('.rename-pop').fill('Yard');
  check(await p4.locator('.outline.label').count() === 1, 'label added');
  await shot(p4, '17-floor-plan-edit');
  await p4.getByRole('button', { name: 'Done' }).click();
  check(await p4.locator('.outline-name', { hasText: 'Garden shed' }).count() === 1, 'outline named');
  await p4.waitForTimeout(400);
  await p4.reload();
  check(await p4.locator('.plan-img').count() === 1 && await p4.locator('.outline').count() === 7 && await p4.locator('.label-text', { hasText: 'Yard' }).count() === 1, 'picture, outline and label kept after reload');
  const [dl4] = await Promise.all([p4.waitForEvent('download'), p4.getByRole('button', { name: 'Save backup' }).click()]);
  const b4 = path.join(TMP, 'b4.json');
  await dl4.saveAs(b4);
  const j4 = JSON.parse(fs.readFileSync(b4, 'utf8'));
  check(/^data:image\/jpeg;base64,/.test(j4.map.image) && j4.map.w === 800 && j4.outlines.length === 7, 'backup carries the picture, outline and label');
  await p4.getByRole('button', { name: 'Edit layout' }).click();
  await p4.getByRole('button', { name: 'Add a room' }).click();
  check(await p4.locator('.room[data-area]').count() === 23, 'room added on top of the picture');
  await p4.getByRole('button', { name: 'Done' }).click();
  await p4.keyboard.press('Control+z');
  check(await p4.locator('.room[data-area]').count() === 22 && await p4.locator('.plan-img').count() === 1, 'undo removes the room and keeps the picture');
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
