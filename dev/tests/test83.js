// Set up by room: pick a room, search an item, add make/model/year/times maintained, save with regular care.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const shots = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch(); let fails = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const dev of ['iPhone SE', 'iPhone 13']) {
    const tag = dev.replace(/ /g, '');
    const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('http://localhost:8123/', r => r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(__dirname + '/../../index.html', 'utf8') }));
    await p.route(/fonts\./, r => r.abort()); await p.route('**/assets/**', r => r.abort());
    await p.goto('http://localhost:8123/'); await p.waitForTimeout(600);
    await p.evaluate(() => { localStorage.setItem('oneplace.guest', JSON.stringify({ profile: { id: 'g1', kind: 'home', tenure: 'owner', name: 'My place', country: 'US' }, actions: 0, nextAsk: 99, tables: { rooms: [], items: [], maintenance_tasks: [], maintenance_logs: [], parts: [], entries: [] } })); localStorage.setItem('oneplace.welcomed', '1'); });
    await p.reload(); await p.waitForTimeout(1200);

    await p.click('[data-testid=room-setup-start]'); await p.waitForSelector('[data-testid=room-setup]');
    if (shots) await p.screenshot({ path: `${shots}/1-rooms-${tag}.png` });
    await p.click('[data-testid=rs-room]:has-text("Kitchen")');
    const first = await p.$$eval('[data-testid=rs-item] .t', e => e.map(x => x.textContent));
    ok(first.includes('Refrigerator') && first.includes('Dishwasher'), dev + ' kitchen list shows common items');
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

    // "+ Add an item" inside a room in Rooms and items goes straight to that room's list
    ok((await p.$$('.hg-rooms [data-testid=room-setup-start]')).length === 1, dev + ' Set up by room button inside Rooms and items');
    await p.click('[data-testid=room-group]:has-text("Kitchen") [data-testid=room-add-item]');
    await p.waitForSelector('[data-testid=room-items]');
    ok((await p.textContent('[data-testid=room-items] h2')) === 'Kitchen', dev + ' room "+ Add an item" opens that room');
    // An item that is not on the list
    await p.fill('[data-testid=rs-search]', 'Espresso machine');
    ok(await p.isVisible('[data-testid=rs-own]'), dev + ' can use a typed item');
    await p.click('[data-testid=rs-own]'); await p.click('[data-testid=rs-save]'); await p.waitForTimeout(1000);
    const T2 = await p.evaluate(() => JSON.parse(localStorage.getItem('oneplace.guest')).tables);
    ok(T2.items.some(i => i.name === 'Espresso machine') && T2.rooms.length === 1, dev + ' typed item saved in the same Kitchen');
    await p.click('summary:has-text("Refrigerator")');
    ok(await p.isVisible('[data-testid=item-manual]'), dev + ' item card has Find the manual');
    if (shots) await p.screenshot({ path: `${shots}/4-home-${tag}.png`, fullPage: true });
    ok(!errs.length, dev + ' no page errors ' + errs.join(';'));
    await c.close();
  }
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
