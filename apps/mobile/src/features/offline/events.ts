export type QueueEvent = 'changed' | 'missing_photo';
const listeners = new Set<(event: QueueEvent) => void>();
export function subscribeQueue(listener: (event: QueueEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyQueue(event: QueueEvent = 'changed') {
  for (const listener of listeners) {
    try { listener(event); } catch { /* A view must not interrupt durable queue work. */ }
  }
}
