import "fake-indexeddb/auto";
import {
  deleteHistory,
  writeHistory,
  readHistory,
  putQueued,
  listQueued,
  deleteQueued,
} from "../../../src/core/services/storage_service.web";
it("stores browser history without duplicates and caps it at 200", async () => {
  await deleteHistory();
  await writeHistory("same", JSON.stringify({ name: "first" }), "2026-11-04");
  await writeHistory("same", JSON.stringify({ name: "updated" }), "2026-11-04");
  expect(await readHistory()).toEqual([{ name: "updated" }]);
  for (let i = 0; i < 201; i++)
    await writeHistory(String(i), JSON.stringify({ id: i }), "2026-11-04");
  expect(await readHistory()).toHaveLength(200);
  expect((await readHistory())[0]).toEqual({ id: 200 });
  await deleteHistory();
  expect(await readHistory()).toEqual([]);
});
it("keeps queued entries across database reads", async () => {
  await putQueued({
    id: "q1",
    kind: "code",
    payload: "4840001000014",
    createdAt: "2026-11-04",
  });
  expect((await listQueued())[0].payload).toBe("4840001000014");
  await deleteQueued("q1");
  expect(await listQueued()).toEqual([]);
});
