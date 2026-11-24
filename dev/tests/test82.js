const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{
const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();const errs=[],dialogs=[];p.on('pageerror',e=>errs.push(e.message));
let accept=true;p.on('dialog',d=>{dialogs.push(d.message());d.accept?(accept?d.accept():d.dismiss()):0});
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());await p.route('**/assets/**',r=>r.abort());
await p.goto('http://localhost:8123/');await p.waitForTimeout(800);
await p.evaluate(()=>{localStorage.setItem('oneplace.guest',JSON.stringify({profile:{id:'g1',kind:'home',tenure:'owner',name:'My place',country:'US'},actions:0,nextAsk:99,tables:{rooms:[],items:[],maintenance_tasks:[],maintenance_logs:[],parts:[],entries:[]}}));localStorage.setItem('oneplace.welcomed','1')});await p.reload();await p.waitForTimeout(1200);
async function add(name){await p.click('[data-testid=plan-my-fix]');await p.waitForSelector('[data-testid=add-item-name]');await p.fill('[data-testid=add-item-name]',name);
 const has=await p.$$eval('[data-testid=add-item-room] option',o=>o.map(x=>x.value));
 if(has.includes('__new')&&has.length<=2){await p.selectOption('[data-testid=add-item-room]','__new');await p.fill('[data-testid=add-item-new-room]','Kitchen')}else await p.selectOption('[data-testid=add-item-room]',has[1]);
 await p.click('text=Save without a plan');await p.waitForTimeout(900)}
await add('Oven light');await add('oven  LIGHT');
const n=await p.evaluate(()=>JSON.parse(localStorage.getItem('oneplace.guest')).tables.items.length);
console.log('items after 2 adds (accepted merge):',n,'dialogs:',dialogs);
accept=false;await add('Oven light');
console.log('items after declining:',await p.evaluate(()=>JSON.parse(localStorage.getItem('oneplace.guest')).tables.items.length),errs);
await b.close()})();
