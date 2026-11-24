// "Parts & how-to" on Needs attention: opens, shows the how-to, brand/model, parts on file, and the Parts/DIY buttons. Fits iPhone sizes.
const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{
const b=await chromium.launch();let bad=0;
for (const dev of ['iPhone SE','iPhone 13','iPhone 15 Pro Max']) {
const c=await b.newContext({...devices[dev]});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());await p.route('**/assets/**',r=>r.abort());
await p.goto('http://localhost:8123/');await p.waitForTimeout(600);
await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);const due=d.toISOString().slice(0,10);
 localStorage.setItem('oneplace.guest',JSON.stringify({profile:{id:'g1',kind:'home',tenure:'owner',name:'My place',country:'US'},actions:0,nextAsk:99,tables:{
 rooms:[{id:'r1',profile_id:'g1',name:'Kitchen'}],
 items:[{id:'i1',profile_id:'g1',room_id:'r1',name:'Refrigerator',brand:'Whirlpool',model:'WRF555SDFZ',problem:'Water dispenser is slow',buy_store:'Amazon'}],
 maintenance_tasks:[{id:'t1',profile_id:'g1',item_id:'i1',title:'Replace water filter',detail:'Turn the old filter left a quarter turn and pull it out. Push the new one in and turn it right until it clicks. Run 2 gallons of water to flush it.',kind:'maintenance',repeat_days:180,status:'active',due_on:due},
  {id:'t2',profile_id:'g1',item_id:'i1',title:'Clean coils',kind:'maintenance',repeat_days:365,status:'active',due_on:due}],
 maintenance_logs:[],parts:[{id:'p1',profile_id:'g1',item_id:'i1',name:'EveryDrop filter 1',part_number:'EDR1RXD1',replaced_on:'2026-05-01',next_due_on:'2026-11-01'}],entries:[]}}));localStorage.setItem('oneplace.welcomed','1')});
await p.reload();await p.waitForTimeout(1200);
const btns=await p.$$('[data-testid=needs-attention] [data-testid=attn-more]');
const hiddenBefore=await p.$eval('[data-testid=attn-more-panel]',e=>e.hidden);
await btns[0].click();await p.waitForTimeout(200);
const r=await p.evaluate(()=>{const pn=document.querySelector('[data-testid=attn-more-panel]');const card=document.querySelector('[data-testid=needs-attention]');
 const over=[...pn.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).length;
 return {open:!pn.hidden,text:pn.innerText,over,cardOver:card.scrollWidth>card.clientWidth+1,label:document.querySelector('[data-testid=attn-more]').textContent}});
const ok=hiddenBefore&&r.open&&/quarter turn/.test(r.text)&&/WRF555SDFZ/.test(r.text)&&/EveryDrop/.test(r.text)&&/Water dispenser/.test(r.text)&&/Reorder|Find it on/.test(r.text)&&r.over===0&&!r.cardOver&&/Hide/.test(r.label)&&btns.length===2&&errs.length===0;
await p.click('[data-testid=attn-more-panel] [data-testid=help-diy]');await p.waitForTimeout(300);
const diyShown=await p.$eval('[data-testid=attn-more-panel] [data-testid=help-panel]',e=>e.style.display!=='none');
// stays open after Snooze re-renders the home screen
await p.click('[data-testid=needs-attention] [data-testid=snooze-button]');await p.waitForTimeout(200);
const stillOpen=await p.$eval('[data-testid=attn-more-panel]',e=>!e.hidden);
await p.screenshot({path:'/tmp/claude-0/test83-'+dev.replace(/ /g,'_')+'.png'});
const pass=ok&&diyShown&&stillOpen; if(!pass)bad++;
console.log(dev, pass?'PASS':'FAIL', JSON.stringify({hiddenBefore,open:r.open,over:r.over,cardOver:r.cardOver,buttons:btns.length,diyShown,stillOpen,errs}));
if(!pass)console.log(r.text);
await c.close();}
await b.close();process.exit(bad?1:0)})();
