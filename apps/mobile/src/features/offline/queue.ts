import { randomUUID } from 'expo-crypto';
import { Code } from '@okbite/shared';
import { api } from '../../lib/api';
import { keepPhoto,readPhoto,removePhoto } from '../../lib/queuedPhoto';
import { putQueued,listQueued,deleteQueued } from '../history/db';
import { saveToHistory } from '../history/store';
export async function enqueue(item:{kind:'photo';uri:string}|{kind:'code';code:string}):Promise<void>{const payload=item.kind==='photo'?await keepPhoto(item.uri):Code.parse(item.code);try{await putQueued({id:randomUUID(),kind:item.kind,payload,createdAt:new Date().toISOString()});}catch(error){if(item.kind==='photo')await removePhoto(payload).catch(()=>{});throw error;}}
export async function discardQueued(id:string):Promise<void>{const item=(await listQueued()).find(row=>row.id===id);if(!item)return;await deleteQueued(id);if(item.kind==='photo')await removePhoto(item.payload);}
let running:Promise<{resolved:number}>|undefined;
export function flushQueue():Promise<{resolved:number}>{if(running)return running;running=drain().finally(()=>{running=undefined;});return running;}
async function drain(){let resolved=0;for(const item of await listQueued()){try{const result=item.kind==='code'?await api.lookup({code:item.payload}):await api.identify(await readPhoto(item.payload));if(result.status!=='found')break;await saveToHistory(result);await deleteQueued(item.id);if(item.kind==='photo')await removePhoto(item.payload);resolved++;}catch{break;}}return {resolved};}
