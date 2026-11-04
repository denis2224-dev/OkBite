import "../test/sqlite";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useProduct } from "./useProduct";
import { saveToHistory, clearHistory } from "../features/history/store";
import { foundYogurt } from "../test/fixtures";
import { api, ApiError } from "../services/api";
jest.mock("../config/preview", () => ({ isPreview: false }));
jest.mock("../services/api", () => ({
  ...jest.requireActual("../services/api"),
  api: { lookup: jest.fn() },
}));
it("opens a cached result when the network is offline", async () => {
  await clearHistory();
  await saveToHistory(foundYogurt);
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError("offline"));
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.product.id).toBe(foundYogurt.product.id);
});
