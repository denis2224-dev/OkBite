/* global __dirname */
const root=require('node:path').resolve(__dirname, '../../../../..');const {build}=require(root+'/node_modules/esbuild');const {chromium}=require(root+'/node_modules/@playwright/test');
(async()=>{
const bundle=await build({stdin:{contents:"import {createZxingReader} from './apps/mobile/src/features/capture/zxingReader.web'; window.makeReader=createZxingReader;",resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();await page.setContent('<!doctype html><title>Synthetic barcode rotation regression</title>');await page.addScriptTag({content:bundle.outputFiles[0].text});
const result=await page.evaluate(async()=>{
 const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];const R=L.map(s=>s.replace(/[01]/g,c=>c==='0'?'1':'0'));const code='0036000291452';
 const bits='101'+[...code.slice(1,7)].map(d=>L[+d]).join('')+'01010'+[...code.slice(7)].map(d=>R[+d]).join('')+'101';
 const canvas=document.createElement('canvas');canvas.width=460;canvas.height=240;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,460,240);ctx.fillStyle='black';[...bits].forEach((b,i)=>{if(b==='1')ctx.fillRect(40+i*4,30,4,180);});
 const rotated=document.createElement('canvas');rotated.width=240;rotated.height=460;const r=rotated.getContext('2d');r.translate(240,0);r.rotate(Math.PI/2);r.drawImage(canvas,0,0);
 const reader=window.makeReader();const horizontal=await reader.readCode(canvas.toDataURL());let vertical=null;try{vertical=await reader.readCode(rotated.toDataURL());}catch{}reader.reset();return {horizontal,vertical};
});console.log(JSON.stringify({browser:browser.version(),...result}));
if(result.horizontal!=='0036000291452'||result.vertical!=='0036000291452')throw Error('Unexpected rotation result');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
