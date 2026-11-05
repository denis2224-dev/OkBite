import {
  demoActions,
  getDemoState,
  resolveDemoCode,
} from "../../../src/shared/state/app_state";
import { Product } from "../../../src/data/models/contract";
import { previewEntries } from "../../../src/data/mock/mock_products";
beforeEach(() => demoActions.reset());
it("recognizes only the three specified demo scan codes", () => {
  for (const code of ["4840001000017", "4840001000024", "4840001000055"])
    expect(resolveDemoCode(code).screen).toBe("confirm");
  for (const code of ["4840001000031", "4840001000048", "12345678"])
    expect(resolveDemoCode(code).screen).toBe("notFound");
});
it("requires an actual history entry for offline opening", () => {
  demoActions.setFlag("offline", true);
  expect(resolveDemoCode("4840001000017").screen).toBe("result");
  demoActions.removeHistory(previewEntries[0]!.product.id);
  expect(resolveDemoCode("4840001000017").screen).toBe("offline");
  expect(resolveDemoCode("12345678").screen).toBe("offline");
  expect(resolveDemoCode("4840001000017", true).screen).toBe("confirm");
});
it("seeds four source entries and deduplicates repeated confirmation", () => {
  expect(getDemoState().history.map((e) => e.product.brand)).toEqual([
    "Zorel",
    "Livada Verde",
    "Ovăzel",
    "Grădina Sudului",
  ]);
  demoActions.addHistory(previewEntries[0]!);
  demoActions.addHistory(previewEntries[0]!);
  expect(getDemoState().history).toHaveLength(4);
  expect(getDemoState().history[0]!.product.brand).toBe("Livada Verde");
  demoActions.clearHistory();
  expect(getDemoState().history).toHaveLength(0);
  demoActions.restoreHistory();
  expect(getDemoState().history).toHaveLength(4);
});
it("keeps every displayed demo product within the shared contract", () => {
  for (const entry of previewEntries)
    expect(Product.safeParse(entry.product).success).toBe(true);
});

it("opens a cached history peer offline even when it is not a demo scan code", () => {
  demoActions.setFlag("offline", true);
  expect(resolveDemoCode(previewEntries[3].product.code!).screen).toBe(
    "result",
  );
});
