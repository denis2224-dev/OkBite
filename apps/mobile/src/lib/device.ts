import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
let pending:Promise<string>|undefined;
export function getDeviceId():Promise<string>{return pending??=load().catch(error=>{pending=undefined;throw error;});}
async function load(){const saved=await SecureStore.getItemAsync('okbite.deviceId');if(saved)return saved;const id=randomUUID();await SecureStore.setItemAsync('okbite.deviceId',id);return id;}
