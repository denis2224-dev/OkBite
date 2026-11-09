import { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { StartupGate } from './StartupGate';
import { ro } from '../../copy/ro';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('mounts application work immediately and opens after 500 ms when ready', async () => {
  const started = jest.fn();
  function App() { useEffect(started, []); return <Text>Application</Text>; }
  await render(<StartupGate ready><App /></StartupGate>);
  expect(started).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('progressbar', { name: ro.app.loading })).toBeTruthy();
  expect(screen.queryByText('Application')).toBeNull();
  await act(async () => { jest.advanceTimersByTime(499); });
  expect(screen.getByRole('progressbar', { name: ro.app.loading })).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('Application')).toBeTruthy();
});

it('waits for fonts after the minimum and releases on initialization error', async () => {
  const view = await render(<StartupGate ready={false}><Text>Application</Text></StartupGate>);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(screen.getByRole('progressbar')).toBeTruthy();
  await view.rerender(<StartupGate ready={false} error={new Error('Font unavailable')}><Text>Application</Text></StartupGate>);
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('Application')).toBeTruthy();
});

it('releases when fonts finish loading and clears its timer on disposal', async () => {
  const view = await render(<StartupGate ready={false}><Text>Application</Text></StartupGate>);
  await act(async () => { jest.advanceTimersByTime(500); });
  await view.rerender(<StartupGate ready><Text>Application</Text></StartupGate>);
  expect(screen.getByText('Application')).toBeTruthy();
  await view.unmount();
  const schedule = jest.spyOn(globalThis, 'setTimeout');
  const cancel = jest.spyOn(globalThis, 'clearTimeout');
  const pending = await render(<StartupGate ready={false}><Text>Application</Text></StartupGate>);
  const index = schedule.mock.calls.findIndex(([, delay]) => delay === 500);
  expect(index).toBeGreaterThanOrEqual(0);
  const scheduled = schedule.mock.results[index];
  if (!scheduled || scheduled.type !== 'return') throw new Error('Startup timer was not scheduled');
  const timer = scheduled.value;
  await pending.unmount();
  expect(cancel).toHaveBeenCalledWith(timer);
  schedule.mockRestore();
  cancel.mockRestore();
});
