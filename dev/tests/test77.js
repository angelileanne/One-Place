const { chromium, devices } = require('playwright'); const fs=require('fs');
const today=new Date();const d=n=>{const x=new Date(today.getTime()+n*864e5);return x.toISOString().slice(0,10)};
const data={profiles:[{id:'p1',owner_id:'u1',kind:'home',tenure:'owner',name:"Fat's House",country:'US',created_at:'2026-01-01'}],
 rooms:[{id:'r1',profile_id:'p1',name:'Kitchen',position:0}],items:[{id:'i1',profile_id:'p1',room_id:'r1',name:'Oven',position:0}],
 maintenance_tasks:[{id:'t1',profile_id:'p1',item_id:'i1',title:'Descale',kind:'maintenance',status:'active',due_on:d(3),size:'quick'}]};
async function run(label,ctxOpts){const b=await chromium.launch();const c=await b.newContext(ctxOpts);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());
await p.route(/ykqnjpgbdwrenilwxkio\.supabase\.co\/.*/,r=>{const u=r.request().url();const t=(u.split('/rest/v1/')[1]||u).split('?')[0];let body=[];if(data[t])body=data[t];else if(/people/.test(t))body=[{id:'u1',first_name:'Me'}];else if(/am_admin/.test(t))body=false;else if(/coin/.test(t))body=0;
 r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)})});
await p.addInitScript(()=>{try{Object.defineProperty(Notification,'permission',{get:()=>'default'})}catch(e){};localStorage.setItem('oneplace.session',JSON.stringify({access_token:'t',refresh_token:'r',expires_at:Date.now()+3e6,user:{id:'u1',email:'me@x.test'}}));localStorage.setItem('oneplace.visits','1');localStorage.setItem('oneplace.welcomed','1');localStorage.setItem('oneplace.profile','p1');localStorage.setItem('oneplace.dragHint','1')});
await p.goto('http://localhost:8123/');await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>[('PushManager' in window),('serviceWorker' in navigator),Notification.permission,document.querySelector('[data-testid=profile-name]')&&document.querySelector('[data-testid=profile-name]').textContent,document.body.innerText.slice(0,120).replace(/\n/g,'|')])); console.log(label,'install',await p.locator('[data-testid=install-card]').count(),'nudge',await p.locator('[data-testid=nudge-home]').count());
if(label==='desk'){await p.click('[data-testid=nudge-home-no]');await p.waitForTimeout(400);console.log('after not now',await p.locator('[data-testid=nudge-home]').count())}
console.log(errs);await b.close()}
(async()=>{await run('desk',{viewport:{width:1440,height:1000}});await run('iphone',{...devices['iPhone 13']})})();
(async()=>{await run('android',{...devices['Pixel 7']})})();
