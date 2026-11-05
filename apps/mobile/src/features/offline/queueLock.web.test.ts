import { withQueueLock } from './queueLock.web';

it('uses the same origin lock for independent tab drains and retains failures for retry', async () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let previous = Promise.resolve<unknown>(undefined);
  const request = jest.fn((_name: string, work: () => Promise<unknown>) => {
    const next = previous.catch(() => {}).then(work);
    previous = next;
    return next;
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request } } });
  try {
    let active = 0, maximum = 0;
    const drain = async () => { active++; maximum = Math.max(maximum, active); await Promise.resolve(); active--; };
    await Promise.all([withQueueLock(drain), withQueueLock(drain)]);
    expect(maximum).toBe(1);
    expect(request.mock.calls.map(([name]) => name)).toEqual(['okbite-offline-queue', 'okbite-offline-queue']);
    await expect(withQueueLock(async () => { throw new Error('retry'); })).rejects.toThrow('retry');
    await expect(withQueueLock(async () => 1)).resolves.toBe(1);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    const unsafeDrain = jest.fn(async () => 1);
    await expect(withQueueLock(unsafeDrain)).rejects.toThrow();
    expect(unsafeDrain).not.toHaveBeenCalled();
  } finally {
    if (before) Object.defineProperty(globalThis, 'navigator', before);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
