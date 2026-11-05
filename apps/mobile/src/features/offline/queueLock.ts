export function withQueueLock<T>(work: () => Promise<T>): Promise<T> { return work(); }
