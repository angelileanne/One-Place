// Set up by room: pick a room, search an item (or snap a photo and pick a match), add make/model/year/times maintained, save with regular care.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const shots = process.env.SHOTS || '';
// The test copy of the app lets a fake AI answer in guest mode (the real app never does this).
function testHtml() {
  let s = fs.readFileSync(__dirname + '/../../index.html', 'utf8');
  const swaps = [
    ['function callAIWith(model, parts, opts) {', 'function callAIWith(model, parts, opts) { if (window.__fakeAI) return window.__fakeAI(parts);'],
    ['if (state.guest) { photoMsg.className = "result bad"', 'if (state.guest && !window.__fakeAI) { photoMsg.className = "result bad"'],
    ['else if (state.guest) drawCare(', 'else if (state.guest && !window.__fakeAI) drawCare('],
    ['if (state.guest) return Promise.reject(new Error("Photos come', 'if (state.guest && window.__fakeAI) return Promise.resolve("fake.jpg"); if (state.guest) return Promise.reject(new Error("Photos come']
  ];
  for (const [a, b] of swaps) { if (!s.includes(a)) throw new Error('test hook missing: ' + a); s = s.replace(a, b); }
  return s;
}
(async () => {
  const b = await chromium.launch(); let fails = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const html = testHtml();
  for (const dev of ['iPhone SE', 'iPhone 13']) {
    const tag = dev.replace(/ /g, '');
    const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('http://localhost:8123/', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
    await p.route(/fonts\./, r => r.abort()); await p.route('**/assets/**', r => r.abort());
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(600);
    await p.evaluate(() => { localStorage.setItem('oneplace.guest', JSON.stringify({ profile: { id: 'g1', kind: 'home', tenure: 'owner', name: 'My place', country: 'US' }, actions: 0, nextAsk: 99, tables: { rooms: [], items: [], maintenance_tasks: [], maintenance_logs: [], parts: [], entries: [] } })); localStorage.setItem('oneplace.welcomed', '1'); });
    await p.reload(); await p.waitForTimeout(1200);

    await p.click('[data-testid=room-setup-start]'); await p.waitForSelector('[data-testid=room-setup]');
    if (shots) await p.screenshot({ path: `${shots}/1-rooms-${tag}.png` });
    await p.click('[data-testid=rs-room]:has-text("Kitchen")');
    const first = await p.$$eval('[data-testid=rs-item] .t', e => e.map(x => x.textContent));
    ok(first.includes('Refrigerator') && first.includes('Dishwasher'), dev + ' kitchen list shows common items');
    ok(!first.includes('Lawn mower') && !first.includes('Toilet'), dev + ' kitchen list has no items from other rooms');
    await p.fill('[data-testid=rs-search]', 'fridge');
    const hits = await p.$$eval('[data-testid=rs-item] .t', e => e.map(x => x.textContent));
    ok(hits[0] === 'Refrigerator', dev + ' "fridge" finds Refrigerator');
    if (shots) await p.screenshot({ path: `${shots}/2-search-${tag}.png` });

    await p.click('[data-testid=rs-item]'); await p.waitForSelector('[data-testid=room-item-form]');
    await p.fill('[data-testid=rs-brand]', 'Whirlpool'); await p.fill('[data-testid=rs-model]', 'WRF555SDFZ');
    await p.fill('[data-testid=rs-year]', '2019'); await p.fill('[data-testid=rs-times]', '2');
    const href = await p.getAttribute('[data-testid=rs-manual]', 'href');
    ok(/Whirlpool.*WRF555SDFZ.*manual/.test(decodeURIComponent(href)), dev + ' manual link uses make and model');
    ok((await p.$$('[data-testid=rs-care]')).length === 2, dev + ' shows 2 regular care tasks');
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!over, dev + ' no sideways scrolling');
    if (shots) await p.screenshot({ path: `${shots}/3-form-${tag}.png`, fullPage: true });
    await p.click('[data-testid=rs-save]'); await p.waitForTimeout(1200);
    const T = await p.evaluate(() => JSON.parse(localStorage.getItem('oneplace.guest')).tables);
    const it = T.items[0] || {};
    ok(it.name === 'Refrigerator' && it.brand === 'Whirlpool' && it.year === 2019 && /: 2$/.test(it.notes || ''), dev + ' item saved with make, year and times maintained');
    ok(T.rooms.some(r => r.name === 'Kitchen'), dev + ' Kitchen room created');
    ok(T.maintenance_tasks.filter(t => t.status === 'active').length === 2, dev + ' 2 reminders saved');

    // Buttons inside Rooms and items
    ok((await p.$$('.hg-rooms [data-testid=room-setup-start]')).length === 1, dev + ' Set up by room button inside Rooms and items');
    await p.click('[data-testid=room-group]:has-text("Kitchen") [data-testid=room-add-item]');
    await p.waitForSelector('[data-testid=room-items]');
    ok((await p.textContent('[data-testid=room-items] h2')) === 'Kitchen', dev + ' room "+ Add an item" opens that room');
    // An item that is not on the list
    await p.fill('[data-testid=rs-search]', 'Espresso grinder');
    ok(await p.isVisible('[data-testid=rs-own]'), dev + ' can use a typed item');
    await p.click('[data-testid=rs-own]'); await p.click('[data-testid=rs-save]'); await p.waitForTimeout(1000);
    const T2 = await p.evaluate(() => JSON.parse(localStorage.getItem('oneplace.guest')).tables);
    ok(T2.items.some(i => i.name === 'Espresso grinder') && T2.rooms.length === 1, dev + ' typed item saved in the same Kitchen');
    await p.click('summary:has-text("Refrigerator")');
    ok(await p.isVisible('[data-testid=item-manual]'), dev + ' item card has Find the manual');
    if (shots) await p.screenshot({ path: `${shots}/4-home-${tag}.png`, fullPage: true });

    // A custom room name ("Front Yard") gets the outdoor list; "door" finds Door, not Outdoor faucets
    await p.fill('[data-testid=new-room-input]', 'Front Yard'); await p.click('[data-testid=new-room-button]'); await p.waitForTimeout(600);
    await p.click('[data-testid=room-group]:has-text("Front Yard") [data-testid=room-add-item]');
    const yard = await p.$$eval('[data-testid=rs-item] .t', e => e.map(x => x.textContent));
    ok(yard.includes('Lawn') && yard.includes('Gutters') && !yard.includes('Refrigerator'), dev + ' Front Yard shows outdoor items');
    await p.fill('[data-testid=rs-search]', 'door');
    const doors = await p.$$eval('[data-testid=rs-results] > *', e => e.map(x => x.textContent));
    ok(doors[0].startsWith('DoorTighten') && !doors.some(t => t.startsWith('Outdoor faucets')), dev + ' "door" shows Door first and not Outdoor faucets ' + JSON.stringify(doors.map(t => t.slice(0, 20))));
    ok(doors.some(t => t === 'From other rooms') && doors.some(t => t.startsWith('Garage door')), dev + ' Garage door listed under From other rooms');
    if (shots) await p.screenshot({ path: `${shots}/5-door-${tag}.png` });

    // Photo: AI lists matches, pick one; Blinds care list is filled in
    await p.reload(); await p.waitForTimeout(1000);
    await p.evaluate(() => { window.__fakeAI = (parts) => {
      const isPhoto = parts.some(x => x.inline_data);
      const txt = isPhoto ? JSON.stringify({ matches: [{ name: 'Faux wood blinds', detail: 'Wide slats with a tilt wand.', brand: null, model: null }, { name: 'Roller shades', detail: 'One sheet of fabric that rolls up.', brand: null, model: null }] })
        : JSON.stringify({ name: 'x', summary: '', tasks: [{ title: 'Wipe the panels', detail: 'Use a damp cloth.', kind: 'maintenance', repeat_days: 60, first_due_in_days: 14 }] });
      return Promise.resolve(txt); }; });
    await p.click('[data-testid=room-setup-start]'); await p.click('[data-testid=rs-room]:has-text("Living room")');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await p.setInputFiles('[data-testid=rs-photo]', { name: 'blinds.png', mimeType: 'image/png', buffer: png });
    await p.waitForSelector('[data-testid=rs-match]', { timeout: 5000 }).catch(() => {});
    const ms = await p.$$eval('[data-testid=rs-match] .t', e => e.map(x => x.textContent));
    ok(ms.length === 2 && ms[0] === 'Faux wood blinds', dev + ' photo shows matches to pick from ' + JSON.stringify(ms) + ' ' + await p.textContent('[data-testid=rs-photo-msg]'));
    if (shots) await p.screenshot({ path: `${shots}/6-matches-${tag}.png`, fullPage: true });
    await p.click('[data-testid=rs-match]'); await p.waitForSelector('[data-testid=room-item-form]');
    const care = await p.$$eval('[data-testid=rs-care-list] .t', e => e.map(x => x.textContent));
    ok((await p.textContent('[data-testid=room-item-form] h2')) === 'Faux wood blinds' && care.includes('Dust the slats'), dev + ' picked match gets the Blinds care list ' + JSON.stringify(care));
    // Not on the list: care is suggested automatically
    await p.click('[data-testid=rs-save]'); await p.waitForTimeout(1000);
    const T3 = await p.evaluate(() => JSON.parse(localStorage.getItem('oneplace.guest')).tables);
    ok(T3.items.some(i => i.name === 'Faux wood blinds' && (i.photos || []).length === 1), dev + ' blinds saved with the photo');
    await p.reload(); await p.waitForTimeout(1000);
    await p.evaluate(() => { window.__fakeAI = () => Promise.resolve(JSON.stringify({ name: 'x', summary: '', tasks: [{ title: 'Wipe the panels', detail: 'Use a damp cloth.', kind: 'maintenance', repeat_days: 60, first_due_in_days: 14 }] })); });
    await p.click('[data-testid=room-setup-start]'); await p.click('[data-testid=rs-room]:has-text("Living room")');
    await p.fill('[data-testid=rs-search]', 'Fish tank'); await p.click('[data-testid=rs-own]');
    await p.waitForSelector('[data-testid=rs-care-list]', { timeout: 5000 }).catch(() => {});
    const sug = await p.$$eval('[data-testid=rs-care-list] .t', e => e.map(x => x.textContent));
    ok(sug.includes('Wipe the panels'), dev + ' unknown item gets suggested care automatically');
    ok(!errs.length, dev + ' no page errors ' + errs.join(';'));
    await c.close();
  }
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
