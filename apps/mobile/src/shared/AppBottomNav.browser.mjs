// Run after pnpm e2e:web:build and node e2e-web/server.mjs.
import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
(async()=>{
 for(const [name,driver] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await driver.launch();
  for(const scaled of [false,true]){
   const page=await browser.newPage({viewport:{width:375,height:812}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:18766/');
   await page.getByRole('tab',{name:'Scanează',exact:true}).waitFor();
   await page.getByTestId('startup-artwork').waitFor({state:'hidden'});
   assert.deepEqual(await page.getByRole('tab').allTextContents(),['Istoric','Compară','Scanează','Alergii','Profil']);
   assert.equal(await page.getByRole('tab',{name:'Scanează',exact:true}).getAttribute('aria-selected'),'true');
   if(scaled) await page.evaluate(()=>{ for(const el of document.querySelectorAll('[dir="auto"]')) { const style=getComputedStyle(el);el.style.fontSize=`${parseFloat(style.fontSize)*2}px`;el.style.lineHeight=`${parseFloat(style.lineHeight)*2}px`; }});
   const nav=await page.getByRole('tablist').boundingBox();assert(nav.x>=0&&nav.x+nav.width<=376);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const scan=page.getByRole('tab',{name:'Scanează',exact:true});const box=await scan.boundingBox();
   assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[role="tab"]')?.getAttribute('aria-label'),{x:box.x+box.width/2,y:box.y+8}),'Scanează');
   await page.screenshot({path:`${tmpdir()}/okbite-n3-${name}-${scaled?'200':'100'}.png`});
   await page.getByRole('tab',{name:'Istoric',exact:true}).click();await page.getByRole('heading',{name:'Istoric',exact:true}).waitFor();
   await page.getByRole('tab',{name:'Profil',exact:true}).click();await page.getByRole('button',{name:'Setări',exact:true}).click();await page.getByRole('heading',{name:'Setări',exact:true}).waitFor();
   assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(),0);
   await page.goto('http://127.0.0.1:18766/compare?id=example');await page.getByRole('tablist').waitFor();assert.equal(new URL(page.url()).pathname,'/compare');
   assert.deepEqual(errors,[]);await page.close();
   console.log(`${name} ${scaled?'200%':'100%'}: five tabs in order, initial selection, raised Scan hit target, History, Profil to Setări, compare link, no page errors PASS`);
  }
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
