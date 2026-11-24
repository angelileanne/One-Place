const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{
for (const [n,o] of [['iphone',devices['iPhone 13']],['se',devices['iPhone SE']]]){
const b=await chromium.launch();const c=await b.newContext({...o,deviceScaleFactor:2});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());await p.route('**/assets/**',r=>r.abort());
await p.goto('http://localhost:8123/');await p.waitForTimeout(800);
await p.evaluate(()=>{localStorage.setItem('oneplace.guest',JSON.stringify({profile:{id:'g1',kind:'home',tenure:'owner',name:'My place',country:'US'},actions:0,nextAsk:99,tables:{rooms:[],items:[],maintenance_tasks:[],maintenance_logs:[],parts:[],entries:[]}}));localStorage.setItem('oneplace.welcomed','1')});await p.reload();await p.waitForTimeout(1200);
const info=async(tag)=>console.log(n,tag,JSON.stringify(await p.evaluate(()=>{const q=document.querySelector('.punchy'),tb=document.getElementById('tabbar'),l=document.querySelector('.pocketlink');const r=q.getBoundingClientRect(),t=tb.getBoundingClientRect(),lr=l.getBoundingClientRect();return {tabHidden:tb.hidden,tab:[t.top|0,t.bottom|0],punchy:[r.top|0,r.bottom|0,r.width|0],inBar:r.top>=t.top&&r.bottom<=t.bottom,link:[lr.top|0,lr.height|0,getComputedStyle(l).visibility,getComputedStyle(l).fontSize]}})));
await info('home'); await p.screenshot({path:'t81-'+n+'-home.png'});
await p.click('[data-testid=plan-my-fix]').catch(()=>{});await p.waitForTimeout(600);await info('flow');
await p.evaluate(()=>{const d=document.createElement('p');d.id='tmsg';d.className='result';d.textContent='That model is busy. Trying a backup… Let me think harder about this, one moment… '.repeat(2);d.style.cssText='position:fixed;left:16px;right:16px;bottom:24px;margin:0;background:#fff;z-index:5';document.getElementById('app').appendChild(d)});
await p.waitForTimeout(600);await info('long message');await p.screenshot({path:'t81-'+n+'-flow.png'});
console.log(errs);await b.close()}})();
