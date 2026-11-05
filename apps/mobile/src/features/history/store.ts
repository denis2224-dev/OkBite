import type { Product,ScoreResult } from '@okbite/shared';
export type HistoryEntry={product:Product;score:ScoreResult;savedAt:string};
export async function saveToHistory(_entry:{product:Product;score:ScoreResult}):Promise<void>{}
export async function listHistory():Promise<HistoryEntry[]>{return [];}
export async function getFromHistory(_id:string):Promise<HistoryEntry|undefined>{return undefined;}
