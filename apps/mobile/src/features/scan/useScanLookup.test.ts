import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, renderHook, act, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import AddScreen from '../../../app/add/index';
import { loadUnknownDraft } from '../add/unknownDraft';
import { GUIDED_ADD_ENABLED, setGuidedAddEnabled } from '../identify/routes';
import { saveToHistory } from '../history/store';
import { useScanLookup } from './useScanLookup';
import { freshLookup as takeFreshLookup, forgetLookup } from '../product/freshLookup';
import { CODE, PRODUCT_ID, lookupFound, lookupNotFound } from '../capture/__fixtures__/responses';

const mockReplace = jest.fn();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };
const mockEnqueue = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => {});
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
  useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'draft-id' }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));
jest.mock('../offline/queue', () => ({ enqueue: (arg: unknown) => mockEnqueue(arg) }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn() }));
jest.mock('../add/unknownDraft', () => ({
  ...jest.requireActual<typeof import('../add/unknownDraftRepository')>('../add/unknownDraftRepository'),
  loadUnknownDraft: jest.fn(async () => null),
  saveUnknownDraft: jest.fn(async () => {}),
  clearUnknownDraft: jest.fn(async () => {}),
}));

const lookup = api.lookup as unknown as jest.Mock<(...a: unknown[]) => Promise<unknown>>;
const offline = Object.assign(new Error('offline'), { code: 'offline' });
const foundLookup = lookupFound as Extract<typeof lookupFound, { status: 'found' }>;

describe('useScanLookup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setGuidedAddEnabled?.(null);
    mockParams.value = {};
    mockEnqueue.mockResolvedValue(undefined);
    jest.mocked(saveToHistory).mockResolvedValue(undefined);
    jest.mocked(loadUnknownDraft).mockResolvedValue(null);
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  });

  it('keeps a found product in scan state for the result sheet', async () => {
    lookup.mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(lookup).toHaveBeenCalledWith({ code: CODE });
    expect(result.current.state).toEqual({ status: 'found', product: foundLookup.product, score: foundLookup.score });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(saveToHistory).toHaveBeenCalledTimes(1);
    expect(saveToHistory).toHaveBeenCalledWith(foundLookup);
  });

  it('hands the found result to the product page so it does not look it up again', async () => {
    lookup.mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(takeFreshLookup(PRODUCT_ID)).toEqual(lookupFound);
  });

  it('hands over a fresh result on every scan of the same product', async () => {
    lookup.mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    for (let scan = 1; scan <= 2; scan++) {
      await act(async () => { await result.current.onManualCode(CODE); });
      expect(takeFreshLookup(PRODUCT_ID)).toEqual(lookupFound);
      forgetLookup(PRODUCT_ID); // the product page used it
      expect(takeFreshLookup(PRODUCT_ID)).toBeUndefined();
    }
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenNthCalledWith(2, { code: CODE });
  });

  it('lets a shopper close the sheet before the write finishes and scopes failure to that lookup', async () => {
    lookup.mockResolvedValue(lookupFound);
    let fail!: (error: Error) => void;
    jest.mocked(saveToHistory).mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }));

    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(result.current.state).toEqual(lookupFound);
    await act(() => result.current.dismiss());
    expect(result.current.state.status).toBe('idle');
    expect(takeFreshLookup(PRODUCT_ID)).toBeUndefined();

    await act(async () => { await result.current.onManualCode(CODE); });
    await act(async () => fail(new Error('storage full')));
    expect(result.current.state).toEqual(lookupFound);
    expect(saveToHistory).toHaveBeenCalledTimes(2);
  });

  it('sends an unknown code to identify as local state with no photoPath', async () => {
    setGuidedAddEnabled(false);
    lookup.mockResolvedValue(lookupNotFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode('96385074'); });
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'code', code: '96385074' } });
  });

  it('asks for manual identity on unknown barcode entry before the guided front-photo step', async () => {
    expect(GUIDED_ADD_ENABLED).toBe(true);
    lookup.mockResolvedValue(lookupNotFound);

    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode('96385074'); });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: { code: '96385074', flow: 'guided' },
    });

    const routeArg = mockReplace.mock.calls[0]?.[0] as { pathname: string; params: Record<string, string> };
    mockParams.value = routeArg.params;
    await render(React.createElement(AddScreen));
    await act(async () => {});

    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.getByText(ro.add.frontTitle)).toBeTruthy();
    expect(screen.getByText(ro.add.stepOf(1, 4))).toBeTruthy();
  });

  it('starts a direct /add visit at the guided front-photo step', async () => {
    await render(React.createElement(AddScreen));
    await act(async () => {});
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.getByText(ro.add.frontTitle)).toBeTruthy();
  });

  it('keeps explicit manual entry reachable with the guided default', async () => {
    mockParams.value = { flow: 'manual' };
    await render(React.createElement(AddScreen));
    expect(screen.getByTestId('add-permission-loading')).toBeTruthy();
    expect(screen.queryByText(ro.add.frontTitle)).toBeNull();
  });

  it('does not look up or navigate for an invalid code', async () => {
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => {
      await result.current.onManualCode('4840001000017');
      await result.current.onCameraCode('12345');
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('creates one request however many times the camera reports the same code', async () => {
    let finish!: (v: unknown) => void;
    lookup.mockReturnValue(new Promise((r) => { finish = r; }));
    const accept = jest.fn();
    const { result } = await renderHook(() => useScanLookup(accept));
    await act(async () => {
      const calls = [result.current.onCameraCode(CODE), result.current.onCameraCode(CODE), result.current.onManualCode(CODE)];
      finish(lookupFound);
      await Promise.all(calls);
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('reports offline, enqueues the code once, ignores camera repetition, and retries on request', async () => {
    lookup.mockRejectedValueOnce(offline).mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(result.current.state).toEqual({ status: 'offline' });
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledWith({ kind: 'code', code: CODE });
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.retry(); });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ status: 'found', product: foundLookup.product, score: foundLookup.score });
  });

  it('resumes camera scanning after dismissing an error, and still accepts a manual code while failed', async () => {
    lookup.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'rate_limited' })).mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(result.current.state).toEqual({ status: 'error', code: 'rate_limited' });
    await act(async () => { result.current.dismiss(); });
    expect(result.current.state).toEqual({ status: 'idle' });
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('accepts a manual code after a failure without dismissing first', async () => {
    lookup.mockRejectedValueOnce(offline).mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onCameraCode(CODE); });
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(result.current.state).toEqual({ status: 'found', product: foundLookup.product, score: foundLookup.score });
  });
  it('resumes after dismissing a result without immediately re-looking up the same camera code', async () => {
    lookup.mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onCameraCode(CODE); });
    await act(async () => { result.current.dismiss(); });
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(lookup).toHaveBeenCalledTimes(1);
  });
  it('retries a failed durable write, then avoids duplicate queued codes on later retries', async () => {
    lookup.mockRejectedValue(offline);
    mockEnqueue.mockRejectedValueOnce(new Error('storage full')).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    await act(async () => { await result.current.retry(); });
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.retry(); });
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
  });
  it.each([null, undefined])('recovers when lookup rejects with %s', async error => {
    lookup.mockRejectedValueOnce(error).mockResolvedValueOnce(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(result.current.state).toEqual({ status: 'error', code: undefined });
    await act(async () => { await result.current.retry(); });
    expect(result.current.state).toEqual({ status: 'found', product: foundLookup.product, score: foundLookup.score });
  });
});
