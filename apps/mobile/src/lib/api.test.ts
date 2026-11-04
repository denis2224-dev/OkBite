import { api, ApiError } from "./api";
import { foundYogurt, validAdd } from "../test/fixtures";
jest.mock("./device", () => ({
  getDeviceId: async () => "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f",
}));
const fetchMock = jest.fn();
beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  global.fetch = fetchMock;
  fetchMock.mockReset();
});
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
it("sends the device id and parses a valid product", async () => {
  fetchMock.mockResolvedValueOnce(response(foundYogurt));
  expect((await api.lookup({ code: "4840001000014" })).status).toBe("found");
  expect(fetchMock.mock.calls[0][1].headers["x-device-id"]).toMatch(
    /^[0-9a-f-]{36}$/,
  );
});
it("rejects a response that breaks the contract", async () => {
  fetchMock.mockResolvedValueOnce(response({ status: "found" }));
  await expect(api.lookup({ code: "4840001000014" })).rejects.toMatchObject({
    code: "invalid_response",
  });
});
it("maps network errors to offline", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
  await expect(api.identify("aGVsbG8=")).rejects.toMatchObject({
    code: "offline",
  });
});
it("preserves structured service errors", async () => {
  fetchMock.mockResolvedValueOnce(
    response({ error: "rate_limited", message: "x" }, 429),
  );
  await expect(api.addProduct(validAdd)).rejects.toMatchObject({
    code: "rate_limited",
  });
});
it("validates requests before sending them", async () => {
  await expect(api.lookup({ code: "12" })).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("times out an unresponsive request", async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_url: unknown, options: RequestInit) =>
      new Promise((_resolve, reject) =>
        options.signal!.addEventListener("abort", () =>
          reject(new Error("Aborted")),
        ),
      ),
  );
  const result = expect(api.identify("aGVsbG8=")).rejects.toMatchObject({
    code: "offline",
  });
  await jest.advanceTimersByTimeAsync(20001);
  await result;
  jest.useRealTimers();
});
