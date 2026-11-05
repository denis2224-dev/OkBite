import { randomUUID } from "expo-crypto";
import { Code } from "../../data/models/contract";
import { api } from "../../data/repositories/product_repository";
import { keepPhoto, readPhoto, removePhoto } from "./photo_storage_service";
import { putQueued, listQueued, deleteQueued } from "./storage_service";
import { saveToHistory } from "../../data/repositories/history_repository";
export async function enqueue(
  item: { kind: "photo"; uri: string } | { kind: "code"; code: string },
): Promise<void> {
  const payload =
    item.kind === "photo" ? await keepPhoto(item.uri) : Code.parse(item.code);
  try {
    await putQueued({
      id: randomUUID(),
      kind: item.kind,
      payload,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (item.kind === "photo") await removePhoto(payload).catch(() => {});
    throw error;
  }
}
export async function discardQueued(id: string): Promise<void> {
  const item = (await listQueued()).find((row) => row.id === id);
  if (!item) return;
  await deleteQueued(id);
  if (item.kind === "photo") await removePhoto(item.payload);
}
let running: Promise<{ resolved: number }> | undefined;
export function flushQueue(
  onResolved?: (id: string) => void,
): Promise<{ resolved: number }> {
  if (running) return running;
  running = drain(onResolved).finally(() => {
    running = undefined;
  });
  return running;
}
async function drain(onResolved?: (id: string) => void) {
  let resolved = 0;
  for (const item of await listQueued()) {
    try {
      const result =
        item.kind === "code"
          ? await api.lookup({ code: item.payload })
          : await api.identify(await readPhoto(item.payload));
      if (result.status !== "found") continue;
      await saveToHistory(result);
      await deleteQueued(item.id);
      if (item.kind === "photo") await removePhoto(item.payload);
      resolved++;
      onResolved?.(result.product.id);
    } catch {
      break;
    }
  }
  return { resolved };
}
