import { consumeInitialAuthUrl } from './callback.web';

it.each(['access_token=access&refresh_token=refresh', 'refresh_token=refresh'])(
  'scrubs callback credentials before validating a %s fragment',
  async (fragment) => {
    const href = `https://okbite.md/admin#${fragment}`;
    const replaceState = jest.fn();
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { href, hash: `#${fragment}`, pathname: '/admin', search: '' },
        history: { replaceState },
      },
    });
    try {
      expect(await consumeInitialAuthUrl()).toBe(href);
      expect(replaceState).toHaveBeenCalledWith(null, '', '/admin');
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  },
);
