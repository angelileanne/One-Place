// Show/hide password eye on sign-in and sign-up (iPhone SE, iPhone 13, Pixel 7)
const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{const errs=[];let bad=0;for(const [n,o] of [['iphone',{...devices['iPhone 13']}],['se',{...devices['iPhone SE']}],['pixel',{...devices['Pixel 7']}]]){const b=await chromium.launch();const c=await b.newContext(o);const p=await c.newPage();
p.on('pageerror',e=>errs.push(n+': '+e.message));
await p.route('http://localhost:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(__dirname+'/../../index.html','utf8')}));await p.route(/fonts\./,r=>r.abort());await p.route('**/assets/**',r=>r.abort());await p.route(/supabase/,r=>r.abort());
await p.goto('http://localhost:8123/');await p.evaluate(()=>localStorage.setItem('oneplace.welcomed','1'));await p.reload();await p.waitForTimeout(1200);
for(const mode of ['signin','signup']){
 if(mode==='signup'){await p.click('button.chip:has-text("Create account")');await p.waitForTimeout(300);}
 const pw=p.locator('[data-testid=auth-password]'),eye=p.locator('[data-testid=auth-password-toggle]');
 await pw.fill('my secret 123');
 const r=await p.evaluate(()=>{const i=document.querySelector('[data-testid=auth-password]').getBoundingClientRect(),e=document.querySelector('[data-testid=auth-password-toggle]').getBoundingClientRect();return {inside:e.left>=i.left&&e.right<=i.right+1&&e.top>=i.top-1&&e.bottom<=i.bottom+1,w:innerWidth,iw:Math.round(i.width)}});
 const t0=await pw.getAttribute('type');await eye.click();const t1=await pw.getAttribute('type');const l1=await eye.getAttribute('aria-label');const v=await pw.inputValue();await eye.click();const t2=await pw.getAttribute('type');
 const ok=r.inside&&t0==='password'&&t1==='text'&&t2==='password'&&v==='my secret 123'&&l1==='Hide password';if(!ok)bad++;
 console.log(n,mode,JSON.stringify(r),t0,t1,t2,l1,ok?'OK':'CHECK');
 if(n==='se'){await eye.click();await p.screenshot({path:__dirname+'/../../../shot-'+mode+'.png'});await eye.click();}
}
await b.close()}console.log('errors',errs,'bad',bad)})();
