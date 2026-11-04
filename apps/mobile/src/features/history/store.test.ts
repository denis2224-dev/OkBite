import '../../test/sqlite';
import { saveToHistory,listHistory,getFromHistory,clearHistory } from './store';
import { previewEntries } from '../../test/fixtures';
beforeEach(async()=>{await clearHistory();});
it('persists recent products, replaces duplicates and clears them',async()=>{await saveToHistory(previewEntries[0]!);await saveToHistory(previewEntries[1]!);await saveToHistory(previewEntries[0]!);const rows=await listHistory();expect(rows).toHaveLength(2);expect(rows[0].product.id).toBe(previewEntries[0]!.product.id);expect((await getFromHistory(rows[0].product.id))?.product.name).toBe('Iaurt natural 2,5%');await clearHistory();expect(await listHistory()).toEqual([]);});
it('rejects malformed product data before saving',async()=>{await expect(saveToHistory({product:{},score:{}} as never)).rejects.toThrow();expect(await listHistory()).toEqual([]);});
