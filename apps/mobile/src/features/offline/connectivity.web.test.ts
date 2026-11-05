import { subscribeReconnect } from './connectivity.web';

it('retries online and visible, without browser listeners surviving cleanup', () => {
  const browser = new EventTarget(), page = new EventTarget();
  const windowBefore = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const navigatorBefore = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const documentValue = Object.assign(page, { visibilityState: 'hidden' });
  const navigatorValue = { onLine: false };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentValue });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigatorValue });
  try {
    const retry = jest.fn(), stop = subscribeReconnect(retry);
    expect(retry).not.toHaveBeenCalled();
    page.dispatchEvent(new Event('visibilitychange'));
    expect(retry).not.toHaveBeenCalled();
    navigatorValue.onLine = true;
    browser.dispatchEvent(new Event('online'));
    documentValue.visibilityState = 'visible';
    page.dispatchEvent(new Event('visibilitychange'));
    expect(retry).toHaveBeenCalledTimes(2);
    stop();
    browser.dispatchEvent(new Event('online'));
    page.dispatchEvent(new Event('visibilitychange'));
    expect(retry).toHaveBeenCalledTimes(2);
  } finally {
    for (const [key, descriptor] of [['window', windowBefore], ['document', documentBefore], ['navigator', navigatorBefore]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
