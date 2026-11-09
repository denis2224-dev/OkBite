import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '../../public/register-sw.js'), 'utf8');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function boot({ controller = {} as object | null } = {}) {
  const page = Object.assign(new EventTarget(), { location: { reload: jest.fn() } });
  const container = Object.assign(new EventTarget(), { controller, register: jest.fn(), getRegistration: jest.fn() });
  const installing = Object.assign(new EventTarget(), { state: 'installing' });
  const waiting = { postMessage: jest.fn() };
  const registration = Object.assign(new EventTarget(), { waiting: null as typeof waiting | null, installing });
  container.register.mockResolvedValue(registration);
  container.getRegistration.mockImplementation(async () => registration);
  const updates = jest.fn();
  page.addEventListener('okbite:sw-update', updates);
  new Function('window', 'navigator', source)(page, { serviceWorker: container });
  page.dispatchEvent(new Event('load'));
  return { page, container, installing, waiting, registration, updates };
}

it('announces a newly installed worker only when it replaces a controlling one', async () => {
  for (const [controller, expected] of [[{}, 1], [null, 0]] as const) {
    const app = boot({ controller });
    await flush();
    expect(app.container.register).toHaveBeenCalledWith('/sw.js');
    expect(app.updates).not.toHaveBeenCalled();
    app.registration.dispatchEvent(new Event('updatefound'));
    app.registration.waiting = app.waiting;
    app.installing.state = 'installed';
    app.installing.dispatchEvent(new Event('statechange'));
    expect(app.updates).toHaveBeenCalledTimes(expected);
  }
});

it('activates the waiting worker and reloads only after an explicit apply', async () => {
  const app = boot();
  app.registration.waiting = app.waiting;
  await flush();
  expect(app.updates).toHaveBeenCalledTimes(1);
  expect(app.waiting.postMessage).not.toHaveBeenCalled();
  app.page.dispatchEvent(new Event('okbite:sw-apply'));
  await flush();
  expect(app.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  expect(app.page.location.reload).not.toHaveBeenCalled();
  app.container.dispatchEvent(new Event('controllerchange'));
  expect(app.page.location.reload).toHaveBeenCalledTimes(1);
});

it('ignores apply without a waiting worker', async () => {
  const app = boot();
  await flush();
  app.page.dispatchEvent(new Event('okbite:sw-apply'));
  await flush();
  app.container.dispatchEvent(new Event('controllerchange'));
  expect(app.page.location.reload).not.toHaveBeenCalled();
});
