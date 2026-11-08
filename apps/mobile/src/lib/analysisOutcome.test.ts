import { api } from './api';

jest.mock('./device', () => ({
  getDeviceId: async () => '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f',
}));
const fetchMock = jest.fn();
const labelRequest = { ingredientsImage: 'aGVsbG8=', nutritionImage: null };
const notFound = {
  status: 'not_found',
  read: { brand: null, name: null, quantity: null, code: null },
  photoPath: 'test-device/front.jpg',
};
const response = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  global.fetch = fetchMock;
  fetchMock.mockReset();
});
afterEach(() => jest.useRealTimers());

it.each(['identifyOutcome', 'readLabelOutcome'] as const)(
  '%s returns pending at 55 seconds without aborting or retrying',
  async (method) => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const operation =
      method === 'identifyOutcome'
        ? api.identifyOutcome('aGVsbG8=')
        : api.readLabelOutcome(labelRequest);
    let finished = false;
    void operation.then(() => {
      finished = true;
    });
    await jest.advanceTimersByTimeAsync(54999);
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(await operation).toMatchObject({ status: 'pending', retryAllowed: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  },
);

it('delivers a validated late answer through the original completion', async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const operation = api.identifyOutcome('aGVsbG8=');
  await jest.advanceTimersByTimeAsync(55000);
  const outcome = await operation;
  if (outcome.status !== 'pending') throw new Error('Expected pending analysis');
  finish(response(notFound));
  expect(await outcome.completion).toEqual(notFound);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('keeps late label responses behind runtime validation', async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const operation = api.readLabelOutcome(labelRequest);
  await jest.advanceTimersByTimeAsync(55000);
  const outcome = await operation;
  if (outcome.status !== 'pending') throw new Error('Expected pending analysis');
  const rejected = expect(outcome.completion).rejects.toMatchObject({ code: 'invalid_response' });
  finish(response({ ingredients: 'wrong shape' }));
  await rejected;
});

it('returns early success and removes its deadline timer', async () => {
  fetchMock.mockResolvedValue(response(notFound));
  expect(await api.identifyOutcome('aGVsbG8=')).toEqual({ status: 'completed', result: notFound });
  expect(jest.getTimerCount()).toBe(0);
});

it('preserves a network failure before the deadline', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  await expect(api.readLabelOutcome(labelRequest)).rejects.toMatchObject({ code: 'offline' });
  expect(jest.getTimerCount()).toBe(0);
});

it('rejects invalid label requests before starting analysis', async () => {
  await expect(
    api.readLabelOutcome({ ingredientsImage: '', nutritionImage: null }),
  ).rejects.toMatchObject({ code: 'bad_request' });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('preserves service errors that arrive after the deadline', async () => {
  let finish!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const operation = api.identifyOutcome('aGVsbG8=');
  await jest.advanceTimersByTimeAsync(55000);
  const outcome = await operation;
  if (outcome.status !== 'pending') throw new Error('Expected pending analysis');
  const rejected = expect(outcome.completion).rejects.toMatchObject({ code: 'rate_limited' });
  finish({ ok: false, json: async () => ({ error: 'rate_limited', message: 'quota' }) });
  await rejected;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
