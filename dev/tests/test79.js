const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{for(const [n,o] of [['iphone',{...devices['iPhone 13']}],['se',{...devices['iPhone SE']}],['pixel',{...devices['Pixel 7']}]]){const b=await chromium.launch();const c=await b.newContext(o);const p=await c.newPage();
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());await p.route('**/assets/**',r=>r.abort());
await p.goto('http://localhost:8123/');await p.waitForTimeout(1200);
for(const stage of ['welcome','home']){
 if(stage==='home'){await p.evaluate(()=>{const pid='g1';localStorage.setItem('oneplace.guest',JSON.stringify({profile:{id:pid,kind:'home',tenure:'owner',name:'My place',country:'US'},actions:0,nextAsk:99,tables:{rooms:[],items:[],maintenance_tasks:[],maintenance_logs:[],parts:[],entries:[]}}));localStorage.setItem('oneplace.welcomed','1')});await p.reload();await p.waitForTimeout(1200)}
 const r=await p.evaluate(()=>{const l=document.querySelector('[data-testid=punchy-pocket]');if(!l||l.hidden)return null;const x=l.getBoundingClientRect();return {left:Math.round(x.left),right:Math.round(x.right),w:innerWidth}});
 console.log(n,stage,JSON.stringify(r),r&&r.right<=r.w-8?'OK':'CHECK')}
await b.close()}})();
