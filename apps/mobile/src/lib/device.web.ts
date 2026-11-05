export async function getDeviceId():Promise<string>{const key='okbite.deviceId';let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}return id;}
