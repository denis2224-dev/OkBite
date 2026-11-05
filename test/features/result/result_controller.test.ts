import "../../helpers/sqlite";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useProduct } from "../../../src/features/result/result_controller";
import {
  saveToHistory,
  clearHistory,
} from "../../../src/data/repositories/history_repository";
import { foundYogurt } from "../../../src/data/mock/mock_products";
import {
  api,
  ApiError,
} from "../../../src/data/repositories/product_repository";
jest.mock("../../../src/shared/state/app_state", () => ({ isPreview: false }));
jest.mock("../../../src/data/repositories/product_repository", () => ({
  ...jest.requireActual("../../../src/data/repositories/product_repository"),
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
