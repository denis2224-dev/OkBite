import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { api } from '../../lib/api';
import { useScanLookup } from './useScanLookup';
import { CODE, PRODUCT_ID, lookupFound, lookupNotFound } from '../capture/__fixtures__/responses';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));

const lookup = api.lookup as unknown as jest.Mock<(...a: unknown[]) => Promise<unknown>>;
const offline = Object.assign(new Error('offline'), { code: 'offline' });

describe('useScanLookup', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  it('opens the product for a code that exists', async () => {
    lookup.mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode(CODE); });
    expect(lookup).toHaveBeenCalledWith({ code: CODE });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('sends an unknown code to identify as local state with no photoPath', async () => {
    lookup.mockResolvedValue(lookupNotFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onManualCode('96385074'); });
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'code', code: '96385074' } });
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

  it('reports offline, ignores the camera repeating the code, and retries on request', async () => {
    lookup.mockRejectedValueOnce(offline).mockResolvedValue(lookupFound);
    const { result } = await renderHook(() => useScanLookup());
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(result.current.state).toEqual({ status: 'offline' });
    await act(async () => { await result.current.onCameraCode(CODE); });
    expect(lookup).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.retry(); });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
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
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });
});
