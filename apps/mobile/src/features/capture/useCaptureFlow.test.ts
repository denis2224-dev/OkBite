import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useRouter } from 'expo-router';
import { useCaptureFlow } from './useCaptureFlow';
import { compressPhoto } from './compressPhoto';
import { findBarcode } from './findBarcode';
import { api } from '../../lib/api';

jest.mock('expo-router', () => { const replace = jest.fn(); return { useRouter: () => ({ replace }) }; });
jest.mock('./compressPhoto', () => ({ compressPhoto: jest.fn() }));
jest.mock('./findBarcode', () => ({ findBarcode: jest.fn() }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));

const mockReplace = useRouter().replace as jest.Mock;
const PRODUCT_ID = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
const validFound = {
  status: 'found' as const,
  product: { id: PRODUCT_ID, code: '4840001000014', status: 'verified' as const, name: 'Iaurt', brand: 'Livada' },
  score: { score: 78, letter: 'A' as const, grade: 'good' as const, reasons: [], missing: [] },
};

describe('useCaptureFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (compressPhoto as jest.Mock).mockResolvedValue({ uri: 'file:///c.jpg', base64: 'BASE64', bytes: 100_000 });
  });
  it('navigates to product when barcode is found and lookup returns found', async () => {
    (findBarcode as jest.Mock).mockResolvedValueOnce('4840001000014');
    (api.lookup as jest.Mock).mockResolvedValueOnce(validFound);
    await useCaptureFlow().processUri('file:///raw.jpg');
    expect(api.lookup).toHaveBeenCalledWith({ code: '4840001000014' });
    expect(api.identify).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });
  it('still calls identify when barcode lookup returns not_found or when barcode is unreadable', async () => {
    (findBarcode as jest.Mock).mockResolvedValueOnce('4840001000014');
    (api.lookup as jest.Mock).mockResolvedValueOnce({ status: 'not_found' });
    (api.identify as jest.Mock).mockResolvedValueOnce({ status: 'not_found', photoPath: 'dev/front.jpg', read: { brand: 'Zorel', name: 'Iaurt', quantity: '400 g', code: null } });
    const flow = useCaptureFlow();
    await flow.processUri('file:///barcode-unknown.jpg');
    expect(api.identify).toHaveBeenCalledWith('BASE64');
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { payload: expect.any(String) } });
    (findBarcode as jest.Mock).mockResolvedValueOnce(null);
    (api.identify as jest.Mock).mockResolvedValueOnce({ ...validFound, photoPath: 'dev/front.jpg' });
    await flow.processUri('file:///front-only.jpg');
    expect(mockReplace).toHaveBeenLastCalledWith(`/product/${PRODUCT_ID}`);
  });
  it('transitions to offline state on network error and prevents duplicate in-flight requests', async () => {
    (findBarcode as jest.Mock).mockResolvedValue(null);
    let resolveIdentify!: (v: unknown) => void;
    (api.identify as jest.Mock).mockReturnValueOnce(new Promise((r) => { resolveIdentify = r; }));
    const flow = useCaptureFlow();
    const [p1, p2] = [flow.processUri('file:///1.jpg'), flow.processUri('file:///2.jpg')];
    resolveIdentify({ ...validFound, photoPath: 'dev/front.jpg' });
    await Promise.all([p1, p2]);
    expect(api.identify).toHaveBeenCalledTimes(1);
    (api.identify as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('Offline'), { code: 'offline' }));
    expect(await flow.processUri('file:///offline.jpg')).toBe('offline');
  });
});
