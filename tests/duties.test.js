// Browser test for lifehouse-duties.html.
// Run:  NODE_PATH="$(npm root -g)" node tests/duties.test.js [screenshot-folder]
// Uses the Timetabler's example school (made-up people). Never put real pupils' details in this repository.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const TT = 'file://' + path.resolve(__dirname, '..', 'lifehouse-timetabler.html');
const DU = 'file://' + path.resolve(__dirname, '..', 'lifehouse-duties.html');
const SHOTS = process.argv[2] || null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'duties-test-'));
const TT_KEY = 'lifehouse_timetabler_v2', DU_KEY = 'lifehouse_duties_v1';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
let failures = 0, passes = 0;
function check(ok, label) {
  if (ok) { passes++; console.log('  ok   ' + label); }
  else { failures++; console.log('  FAIL ' + label); }
}
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  const errors = [];
  const tt = await ctx.newPage();
  tt.on('pageerror', (e) => errors.push('Timetabler: ' + e.message));
  await tt.goto(TT);
  await tt.getByRole('button', { name: 'Or try the example school (made-up people)' }).click();
  await tt.waitForTimeout(700);
  const ttBefore = await tt.evaluate((k) => localStorage.getItem(k), TT_KEY);
  const plan = JSON.parse(ttBefore);
  const du = await ctx.newPage();
  du.on('pageerror', (e) => errors.push('Duties: ' + e.message));
  const store = () => du.evaluate((k) => JSON.parse(localStorage.getItem(k)), DU_KEY);

  console.log('Starting from the timetable');
  await du.goto(DU);
  check(await du.getByRole('button', { name: 'Use the timetable in this browser' }).isEnabled(), 'finds the timetable saved in this browser');
  await du.getByRole('button', { name: 'Use the timetable in this browser' }).click();
  let j = await store();
  check(j.times.map((t) => t.name).join('|') === 'Wellbeing|Break|Lunch: eating|Lunch: play' && j.times[2].start === '12.00pm' && j.times[3].end === '1.10pm', 'duty times come from the school day, with lunch split in two');
  await du.getByRole('button', { name: 'Times and staff' }).click();
  check(/after Lesson 1, before Lesson 2/.test(await du.locator('tr[data-time="B"]').innerText()), 'break is shown between Lesson 1 and Lesson 2');
  const id = (n) => plan.people.find((p) => p.name === n).id;
  for (const n of ['Abi', 'Ben']) await du.locator('input[aria-label="' + n + ' is a teacher"]').check();
  await du.locator('input[aria-label="Zac does duties"]').uncheck();

  console.log('Children, areas and rules');
  await du.getByRole('button', { name: 'Children to watch' }).click();
  for (const n of ['AB', 'CD', 'HM']) { await du.locator('select[aria-label="Child to add"]').selectOption({ label: n }); await du.getByRole('button', { name: 'Add', exact: true }).click(); }
  await du.locator('select[aria-label="Adults for CD"]').selectOption('2');
  await du.locator('tr[data-watch="' + id('HM') + '"] td').nth(3).getByRole('button', { name: 'Choose…' }).click();
  await du.locator('dialog label', { hasText: /^Carys$/ }).locator('input').check();
  await du.locator('dialog').getByRole('button', { name: 'Save' }).click();
  await du.locator('input[aria-label="HM at Wellbeing"]').uncheck();
  j = await store();
  const hm = j.watches.find((w) => w.pupil === id('HM'));
  check(j.watches.length === 3 && hm.never.includes(id('Carys')) && !hm.times.includes('W') && j.watches.find((w) => w.pupil === id('CD')).need === 2, 'children are added with their times, how many adults, and who they must not be with');
  await du.getByRole('button', { name: 'Rules', exact: true }).click();
  await du.locator('.rule[data-rule="teacherLunch"] .seg button', { hasText: 'Must' }).click();
  j = await store();
  check(j.rules.teacherLunch.level === 'must', 'a rule can be made a Must');
  await shot(du, 'duties-rules');

  console.log('Suggesting a rota');
  await du.getByRole('button', { name: 'Rota', exact: true }).click();
  await du.getByRole('button', { name: 'Suggest a rota' }).click();
  await du.waitForTimeout(300);
  check(/Filled \d+ places/.test(await du.locator('.toast').last().innerText()), 'Suggest a rota fills the week');
  await shot(du, 'duties-rota');
  j = await store();
  // The rules, checked against the timetable itself.
  const at = (pid, day, per) => ((plan.slots[day + '|' + per] || {}).at || {})[pid] || '';
  const offsite = new Set(plan.areas.filter((a) => a.kind === 'offsite').map((a) => a.id));
  const touch = { W: ['P1'], B: ['P1', 'P2'], L1: ['P2'], L2: ['P3'] }, near = { W: ['P1'], B: ['P1', 'P2'], L1: ['P2', 'P3'], L2: ['P2', 'P3'] };
  const teachers = new Set([id('Abi'), id('Ben')]);
  let total = 0, double = 0, tooMany = 0, noLunch = 0, offBreak = 0, notInBreak = 0, teacherLunch = 0, never = 0, zac = 0, kept = 0, keepable = 0, freshBreak = 0;
  for (const d of DAYS) {
    const perDay = {};
    for (const [tid, m] of Object.entries(j.rota[d] || {})) {
      const seen = new Set();
      for (const [k, ids] of Object.entries(m)) for (const s of ids) {
        total++;
        if (seen.has(s)) double++; seen.add(s);
        (perDay[s] = perDay[s] || []).push(tid);
        if (touch[tid].some((p) => offsite.has(at(s, d, p)))) offBreak++;
        if (near[tid].some((p) => at(s, d, p) === 'OUT')) notInBreak++;
        if (teachers.has(s) && /^L/.test(tid)) teacherLunch++;
        if (k === 'w:' + id('HM') && s === id('Carys')) never++;
        if (s === id('Zac')) zac++;
      }
    }
    for (const list of Object.values(perDay)) { if (list.length > 2) tooMany++; if (list.includes('L1') && list.includes('L2')) noLunch++; }
    // At break, an adult AB was with in Lesson 1, or has in Lesson 2, keeps them where they can.
    const ab = id('AB'), withAB = (per) => { const pl = at(ab, d, per); return plan.people.filter((p) => p.role === 'staff' && pl && pl !== 'OUT' && !offsite.has(pl) && at(p.id, d, per) === pl).map((p) => p.id); };
    const was = withAB('P1').concat(withAB('P2')), got = ((j.rota[d] || {}).B || {})['w:' + ab] || [];
    if (was.length && got.length) { keepable++; if (got.some((s) => was.includes(s))) kept++; }
    // At lunch, not the adult who had AB in Lesson 2.
    const pl2 = at(ab, d, 'P2'), had2 = plan.people.filter((p) => p.role === 'staff' && pl2 && pl2 !== 'OUT' && at(p.id, d, 'P2') === pl2).map((p) => p.id);
    for (const t of ['L1', 'L2']) if ((((j.rota[d] || {})[t] || {})['w:' + ab] || []).some((s) => had2.includes(s))) freshBreak++;
  }
  check(total > 60, 'the week has ' + total + ' duties filled');
  check(double === 0, 'nobody has two duties at once');
  check(tooMany === 0, 'nobody has more than 2 duties a day');
  check(noLunch === 0, 'everyone has part of lunch off');
  check(offBreak === 0, 'nobody is on duty next to being off site');
  check(notInBreak === 0, 'nobody is on duty when the timetable says they are not in');
  check(teacherLunch === 0, 'teachers have lunch off (a Must rule here)');
  check(never === 0 && zac === 0, 'a child’s “never with” and staff who don’t do duties are respected');
  check(keepable > 0 && kept === keepable, 'at break, AB stays with an adult from Lesson 1 or 2 (' + kept + ' of ' + keepable + ' days)');
  check(freshBreak === 0, 'at lunch, AB has a different adult from Lesson 2');

  console.log('Changing it by hand');
  const cell = (k, t) => du.locator('td[data-k="' + k + '"][data-t="' + t + '"]');
  await cell('w:' + id('AB'), 'B').locator('.cell-btn').click();
  check((await du.locator('dialog .dlg-title').innerText()).startsWith('Monday · Break') && await du.locator('dialog .cand .tag', { hasText: 'Best fit' }).count() === 1, 'clicking a duty lists who can do it, best fit first');
  await shot(du, 'duties-picker');
  const blocked = du.locator('dialog .cand.blocked').first();
  const blockedName = await blocked.locator('.chip').innerText();
  await blocked.click();
  if (await du.locator('dialog[open]').count()) await du.locator('dialog .dlg-foot').getByRole('button', { name: 'Done' }).click();
  check(await cell('w:' + id('AB'), 'B').getAttribute('class') === 'bad' && /\(Must\)/.test(await du.locator('.issues').innerText()) && (await du.locator('.issues').innerText()).includes(blockedName), 'choosing someone a Must rule rules out is marked ! with the reason');
  await du.locator('#top').getByRole('button', { name: 'Undo', exact: true }).click();
  check(await cell('w:' + id('AB'), 'B').getAttribute('class') !== 'bad', 'Undo puts it back');
  const play = cell('p:A1', 'B');
  await du.locator('.tray .chip', { hasText: /^Abi$/ }).dragTo(play);
  check(/Abi/.test(await play.innerText()), 'a name dragged from the staff list onto a duty is put on it');
  await play.locator('.chip', { hasText: /^Abi/ }).dragTo(du.locator('.tray'));
  check(!/Abi/.test(await play.innerText()), 'and dragged back to the list, taken off');
  const mover = await play.locator('.chip').first().innerText();
  const lunchPlay = cell('p:A1', 'L2');
  await play.locator('.chip').first().dragTo(lunchPlay);
  check(!(await play.innerText()).includes(mover.split('\n')[0]) && (await lunchPlay.innerText()).includes(mover.split('\n')[0]), 'a name dragged from one duty to another moves there');

  console.log('The week, printing and files');
  await du.locator('.seg button', { hasText: 'Week' }).click();
  check(await du.locator('table.week tbody tr').count() === 22, 'the week shows everyone who does duties, with their totals');
  await shot(du, 'duties-week');
  await du.evaluate(() => { window.print = () => { window.__printed = true; }; });
  await du.getByRole('button', { name: 'Print the week' }).click();
  check(await du.evaluate(() => window.__printed) && await du.locator('#print .p-day').count() === 5, 'Print the week makes a sheet for each day');
  await du.reload();
  check(await du.locator('table.week').count() === 1 && (await store()).watches.length === 3, 'everything is still there after reloading');
  const [dl] = await Promise.all([du.waitForEvent('download'), du.getByRole('button', { name: 'Save duties file' }).click()]);
  const dPath = path.join(TMP, 'duties.json');
  await dl.saveAs(dPath);
  const saved = JSON.parse(fs.readFileSync(dPath, 'utf8'));
  check(saved.app === 'lifehouse-duties' && /duties - \d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), 'Save duties file downloads the rota and rules');
  const ttAfter = await tt.evaluate((k) => localStorage.getItem(k), TT_KEY);
  check(ttAfter === ttBefore, 'the timetable is never changed');

  // Another computer: no timetable in the browser, so open a backup, then the duties file.
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const d2 = await ctx2.newPage();
  d2.on('pageerror', (e) => errors.push('Duties 2: ' + e.message));
  await d2.goto(DU);
  check(await d2.getByRole('button', { name: 'Use the timetable in this browser' }).isDisabled(), 'with no timetable in the browser, it asks for a backup');
  const bPath = path.join(TMP, 'Example timetable backup.json');
  fs.writeFileSync(bPath, ttBefore);
  await d2.setInputFiles('#file-open', bPath);
  await d2.waitForTimeout(300);
  check(await d2.locator('.tabs').count() === 1 && /Read the timetable/.test(await d2.locator('.toast').last().innerText()), 'a timetable backup can be opened');
  await d2.setInputFiles('#file-open', dPath);
  await d2.waitForTimeout(300);
  const j2 = await d2.evaluate((k) => JSON.parse(localStorage.getItem(k)), DU_KEY);
  check(JSON.stringify(j2.rota) === JSON.stringify(saved.rota) && j2.watches.length === 3, 'and a saved duties file brings the rota back');
  await ctx2.close();

  check(errors.length === 0, 'no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
