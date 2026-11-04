import "../../helpers/sqlite";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { WorkflowPreview } from "../../../src/features/capture/capture_screen";
import { ro } from "../../../src/core/constants/strings_ro";
import { demoActions, getDemoState } from "../../../src/shared/state/app_state";
import { previewEntries } from "../../../src/data/mock/mock_products";
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => false,
    back: jest.fn(),
  },
}));
beforeEach(() => {
  demoActions.reset();
  jest.clearAllMocks();
});
async function mount(
  initial: "scan" | "ingredientsPhoto" | "review" = "scan",
  forId?: string,
) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <WorkflowPreview initial={initial} forId={forId} />
    </SafeAreaProvider>,
  );
}
it("requires confirmation before opening or recording a scanned product", async () => {
  demoActions.clearHistory();
  await mount();
  await fireEvent.press(screen.getByRole("button", { name: "Iaurt natural" }));
  expect(
    screen.getByRole("header", { name: ro.identify.confirm }),
  ).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  expect(getDemoState().history).toHaveLength(0);
  await fireEvent.press(screen.getByRole("button", { name: ro.identify.yes }));
  expect(router.push).toHaveBeenCalledWith(
    `/product/${previewEntries[0]!.product.id}`,
  );
  expect(getDemoState().history).toHaveLength(1);
});
it("rejecting a product opens not found and back restores scanner", async () => {
  await mount();
  await fireEvent.press(
    screen.getByRole("button", { name: "Iaurt cu căpșuni" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: ro.identify.none }));
  expect(
    screen.getByRole("header", { name: ro.app.design.notFoundTitle }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: ro.app.back }));
  expect(screen.getByRole("header", { name: ro.scan.title })).toBeTruthy();
});
it("uses the gallery for two photos when camera access is denied", async () => {
  demoActions.setFlag("camDenied", true);
  await mount("ingredientsPhoto");
  expect(screen.getByText(ro.app.design.captureDenied)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: ro.capture.gallery }),
  );
  expect(screen.getByRole("header", { name: "Pasul 2 din 2" })).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: ro.capture.gallery }),
  );
  expect(screen.getByRole("header", { name: ro.review.title })).toBeTruthy();
  expect(screen.getByLabelText(ro.result.nutrients.fiber)).toBeTruthy();
});
it("opens a cached product offline and reconnects an uncached lookup", async () => {
  demoActions.setFlag("offline", true);
  await mount();
  await fireEvent.press(screen.getByRole("button", { name: "Iaurt natural" }));
  expect(router.push).toHaveBeenCalledWith(
    `/product/${previewEntries[0]!.product.id}`,
  );
});
it("reconnects and repeats the pending scan", async () => {
  demoActions.setFlag("offline", true);
  demoActions.clearHistory();
  await mount();
  await fireEvent.press(
    screen.getByRole("button", { name: "Iaurt cu căpșuni" }),
  );
  expect(screen.getByText(ro.app.design.offlineTitle)).toBeTruthy();
  await fireEvent.press(screen.getByText(ro.app.design.reconnect));
  expect(
    screen.getByRole("header", { name: ro.identify.confirm }),
  ).toBeTruthy();
  expect(getDemoState().offline).toBe(false);
});
it("saves a corrected photographed product with score and allergens", async () => {
  await mount("review");
  await fireEvent.press(screen.getByRole("button", { name: ro.review.save }));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith(
      "/product/0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e7f",
    ),
  );
  const saved = getDemoState().history[0]!;
  expect(saved.score.score).toBe(30);
  expect(saved.product.allergens).toEqual(["Gluten", "Lapte", "Soia"]);
});
it("requests only the table for an existing product without a score", async () => {
  await mount("ingredientsPhoto", previewEntries[5]!.product.id);
  expect(
    screen.getByRole("header", { name: ro.app.design.tableTitle }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: ro.capture.take }));
  await fireEvent.press(screen.getByRole("button", { name: ro.review.save }));
  expect(getDemoState().pendingTables).toContain(previewEntries[5]!.product.id);
  expect(
    getDemoState().products[previewEntries[5]!.product.id]!.score.score,
  ).toBeNull();
});
