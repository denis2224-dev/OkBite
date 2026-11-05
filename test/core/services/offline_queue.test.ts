import "../../helpers/sqlite";
import { enqueue, flushQueue } from "../../../src/core/services/offline_queue";
import { listQueued } from "../../../src/core/services/storage_service";
import { foundYogurt } from "../../../src/data/mock/mock_products";
import { api } from "../../../src/data/repositories/product_repository";
import { keepPhoto } from "../../../src/core/services/photo_storage_service";
jest.mock("../../../src/data/repositories/product_repository", () => ({
  api: { lookup: jest.fn(), identify: jest.fn() },
  ApiError: class extends Error {},
}));
jest.mock("../../../src/core/services/photo_storage_service", () => ({
  keepPhoto: jest.fn(async () => "saved/photo.jpg"),
  readPhoto: async () => "base64-photo",
  removePhoto: async () => {},
}));
it("keeps a photo copy and retries failed entries in order", async () => {
  await enqueue({ kind: "photo", uri: "temporary/photo.jpg" });
  await enqueue({ kind: "code", code: "4840001000014" });
  expect(keepPhoto).toHaveBeenCalledWith("temporary/photo.jpg");
  jest.mocked(api.identify).mockRejectedValueOnce(new Error("offline"));
  expect(await flushQueue()).toEqual({ resolved: 0 });
  expect(await listQueued()).toHaveLength(2);
  jest
    .mocked(api.identify)
    .mockResolvedValueOnce({ ...foundYogurt, photoPath: "demo/a.jpg" });
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  const [a, b] = await Promise.all([flushQueue(), flushQueue()]);
  expect(a).toEqual({ resolved: 2 });
  expect(b).toEqual(a);
  expect(await listQueued()).toHaveLength(0);
});
it("keeps an unknown product without blocking later known products", async () => {
  await enqueue({ kind: "code", code: "4841234567890" });
  await enqueue({ kind: "code", code: "4840001000014" });
  jest
    .mocked(api.lookup)
    .mockResolvedValueOnce({ status: "not_found" })
    .mockResolvedValueOnce(foundYogurt);
  expect(await flushQueue()).toEqual({ resolved: 1 });
  const pending = await listQueued();
  expect(pending).toHaveLength(1);
  expect(pending[0].payload).toBe("4841234567890");
});
