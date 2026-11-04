import { z } from 'zod';
import { Product,ScoreResult } from '@okbite/shared';
import { readHistory,writeHistory,deleteHistory } from './db';
const Entry=z.object({product:Product,score:ScoreResult,savedAt:z.string().datetime()});
export type HistoryEntry=z.infer<typeof Entry>;
export async function saveToHistory(entry:{product:Product;score:ScoreResult}):Promise<void>{const value=Entry.parse({...entry,savedAt:new Date().toISOString()});await writeHistory(value.product.id,JSON.stringify(value),value.savedAt);}
export async function listHistory():Promise<HistoryEntry[]>{return (await readHistory()).flatMap(row=>{const parsed=Entry.safeParse(row);return parsed.success?[parsed.data]:[];});}
export async function getFromHistory(id:string):Promise<HistoryEntry|undefined>{return (await listHistory()).find(entry=>entry.product.id===id);}
export async function clearHistory():Promise<void>{await deleteHistory();}
