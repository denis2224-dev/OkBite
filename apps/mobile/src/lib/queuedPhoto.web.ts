import { createStore,get,set,del } from 'idb-keyval';
const photos=createStore('okbite-photos','photos');
export async function keepPhoto(uri:string){const response=await fetch(uri);if(!response.ok)throw new Error('Fotografia nu poate fi citită.');const blob=await response.blob(),id=crypto.randomUUID();await set(id,blob,photos);return id;}
export async function readPhoto(id:string){const blob=await get<Blob>(id,photos);if(!blob)throw new Error('Fotografia nu este disponibilă.');return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]??'');reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
export async function removePhoto(id:string){await del(id,photos);}
