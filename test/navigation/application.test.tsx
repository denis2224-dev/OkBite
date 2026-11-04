import "../helpers/sqlite";
import {
  renderRouter,
  screen,
  fireEvent,
  cleanup,
} from "expo-router/testing-library";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../../src/core/theme/app_theme";
import { ToastProvider } from "../../src/shared/widgets/toast";
import TabLayout from "../../src/core/router/app_router";
import Home from "../../src/features/home/home_screen";
import Compare from "../../src/features/compare/compare_screen";
import History from "../../src/features/history/history_screen";
import Preview from "../../src/features/capture/preview_route";
import Product from "../../src/features/result/result_screen";
import Offline from "../../src/features/states/offline_screen";
import About from "../../src/features/legal/about_screen";
import Privacy from "../../src/features/legal/privacy_screen";
import Terms from "../../src/features/legal/terms_screen";
import Method from "../../src/features/legal/method_screen";
import NotFound from "../../src/features/states/route_not_found_screen";
import { demoActions } from "../../src/shared/state/app_state";

function Root() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, animation: "none" }} />
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
const routes = {
  _layout: Root,
  "(tabs)/_layout": TabLayout,
  "(tabs)/index": Home,
  "(tabs)/compare": Compare,
  "(tabs)/history": History,
  preview: Preview,
  "product/[id]/index": Product,
  "compare-detail": Compare,
  offline: Offline,
  "(info)/about": About,
  "(info)/privacy": Privacy,
  "(info)/terms": Terms,
  "(info)/method": Method,
  "+not-found": NotFound,
};
let errors: jest.SpyInstance;
let warnings: jest.SpyInstance;
beforeEach(() => {
  demoActions.reset();
  errors = jest.spyOn(console, "error").mockImplementation(() => {});
  warnings = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  try {
    expect(errors.mock.calls).toEqual([]);
    expect(warnings.mock.calls).toEqual([]);
  } finally {
    jest.useRealTimers();
    errors.mockRestore();
    warnings.mockRestore();
  }
  await clearHistory();
});
it("switches root tabs repeatedly without unhandled navigation actions", async () => {
  await renderRouter(routes);
  for (const name of ["Compară", "Istoric", "Acasă", "Acasă", "Compară"]) {
    await fireEvent.press(screen.getByLabelText(name));
  }
  expect(screen.getByRole("header", { name: "Comparație" })).toBeTruthy();
  expect(errors).not.toHaveBeenCalled();
});
it("opens root comparison from the home shortcut without popping an empty stack", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    screen.getByRole("button", { name: "Compară produse" }),
  );
  expect(screen.getByRole("header", { name: "Comparație" })).toBeTruthy();
  expect(errors).not.toHaveBeenCalled();
});

// These tests keep Expo Router and every application screen real. Only the
// native persistence driver is replaced by the existing in-memory SQL adapter.
import { waitFor } from "expo-router/testing-library";
import { router } from "expo-router";
import { getDemoState } from "../../src/shared/state/app_state";
import { ro } from "../../src/core/constants/strings_ro";
import { ocrFor } from "../../src/data/mock/mock_ocr";
import { clearHistory } from "../../src/data/repositories/history_repository";

const yogurtId = "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f";
const strawberryId = "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e2f";
const juiceId = "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f";
const newId = "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e7f";
async function press(name: string) {
  await fireEvent.press(screen.getByRole("button", { name }));
}
async function header(name: string) {
  await waitFor(() =>
    expect(screen.getByRole("header", { name })).toBeTruthy(),
  );
}
async function back() {
  await press(ro.app.back);
}
async function tab(name: string) {
  await fireEvent.press(screen.getByLabelText(name));
}
async function photoPair() {
  await press(ro.capture.take);
  await header("Pasul 2 din 2");
  await press(ro.capture.take);
  await header(ro.review.title);
}
async function closeSheet() {
  const close = screen.getAllByRole("button", { name: ro.app.close });
  await fireEvent.press(close[close.length - 1]);
}

it("opens all history from Home and keeps a root-only stack", async () => {
  await renderRouter(routes);
  await fireEvent.press(screen.getByRole("link", { name: ro.home.allHistory }));
  await header(ro.history.title);
  expect(router.canDismiss()).toBe(false);
});
it("handles back from a directly opened result without an empty-stack action", async () => {
  await renderRouter(routes, { initialUrl: `/product/${yogurtId}` });
  await header(ro.result.title);
  await back();
  await header("okBite");
  expect(router.canDismiss()).toBe(false);
});
it("validates manual entry and completes scan, details, comparison and back navigation", async () => {
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await header(ro.scan.title);
  await press(ro.scan.submit);
  expect(screen.getAllByText(ro.app.design.manualEmpty).length).toBeGreaterThan(
    0,
  );
  await fireEvent.changeText(
    screen.getByLabelText(ro.scan.manualLabel),
    "ab12 345",
  );
  await press(ro.scan.submit);
  expect(
    screen.getAllByText("Codul trebuie să aibă 8 sau 13 cifre. Ai introdus 5.")
      .length,
  ).toBeGreaterThan(0);
  await fireEvent.changeText(
    screen.getByLabelText(ro.scan.manualLabel),
    "484a0001000024",
  );
  await press(ro.scan.submit);
  await header(ro.identify.confirm);
  await press(ro.identify.yes);
  await header(ro.result.title);
  await waitFor(() =>
    expect(
      screen.getByLabelText("44 din 100, calitate nutrițională medie"),
    ).toBeTruthy(),
  );
  expect(screen.queryByLabelText(ro.nav.home)).toBeNull();
  expect(getDemoState().history[0].product.id).toBe(strawberryId);
  await press(ro.result.ingredients);
  await header(ro.ingredients.title);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Lapte normalizat" }),
    ).toBeTruthy(),
  );
  await press("Lapte normalizat");
  expect(
    screen.getByRole("button", { name: "Lapte normalizat" }).props
      .accessibilityState.expanded,
  ).toBe(true);
  await back();
  await header(ro.result.title);
  await press(ro.nav.compare);
  await header(ro.compare.title);
  expect(screen.queryByLabelText(ro.nav.home)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Produsul A: Iaurt cu căpșuni 2%" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Produsul B: Iaurt natural 2,5%" }),
  ).toBeTruthy();
  await back();
  await header(ro.result.title);
  await back();
  await header(ro.scan.title);
  await back();
  await header("okBite");
});
it("rejects a scan without recording it and restores the scanner on back", async () => {
  demoActions.clearHistory();
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await press("Iaurt natural");
  await header(ro.identify.confirm);
  await press(ro.identify.none);
  await header(ro.app.design.notFoundTitle);
  expect(getDemoState().history).toHaveLength(0);
  await back();
  await header(ro.scan.title);
});
it("adds an unknown product through two photographs and editable text", async () => {
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await press(ro.app.design.unknown);
  await header(ro.app.design.notFoundTitle);
  await press(ro.identify.add);
  await header("Pasul 1 din 2");
  await photoPair();
  await press(ro.review.save);
  await header(ro.result.title);
  await waitFor(() =>
    expect(
      screen.getByLabelText("30 din 100, calitate nutrițională scăzută"),
    ).toBeTruthy(),
  );
  expect(getDemoState().history[0].product.id).toBe(newId);
  expect(screen.getByText(ro.result.unverified)).toBeTruthy();
});
it("opens the label sheet and closes it before reporting a demo correction", async () => {
  await renderRouter(routes, { initialUrl: `/product/${yogurtId}` });
  await waitFor(() =>
    expect(
      screen.getByLabelText("78 din 100, calitate nutrițională bună"),
    ).toBeTruthy(),
  );
  const buttons = screen.getAllByRole("button", { name: ro.result.original });
  await fireEvent.press(buttons[0]);
  expect(
    screen.getByRole("header", { name: ro.app.design.labelTitle }),
  ).toBeTruthy();
  await closeSheet();
  await press(ro.result.report);
  expect(screen.getByText(ro.app.design.reportThanks)).toBeTruthy();
});
it("toggles demo states through the sheet and restores them", async () => {
  await renderRouter(routes);
  await press(ro.app.design.demoTitle);
  for (const name of [
    ro.offline.title,
    ro.app.design.cameraTitle,
    ro.app.design.ocrTitle,
  ])
    await fireEvent.press(screen.getByRole("switch", { name }));
  expect(getDemoState()).toMatchObject({
    offline: true,
    camDenied: true,
    ocrUnclear: true,
  });
  for (const name of [
    ro.offline.title,
    ro.app.design.cameraTitle,
    ro.app.design.ocrTitle,
  ])
    await fireEvent.press(screen.getByRole("switch", { name }));
  await closeSheet();
  expect(getDemoState()).toMatchObject({
    offline: false,
    camDenied: false,
    ocrUnclear: false,
  });
});
it("keeps manual entry available with camera denied and allows recovery", async () => {
  demoActions.setFlag("camDenied", true);
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  expect(screen.getByText(ro.app.design.scanDenied)).toBeTruthy();
  await press(ro.app.design.allow);
  expect(getDemoState().camDenied).toBe(false);
  await press("Iaurt natural");
  await header(ro.identify.confirm);
});
it("uses gallery alternatives for both camera-denied photo steps", async () => {
  demoActions.setFlag("camDenied", true);
  await renderRouter(routes);
  await press(ro.home.photoButton);
  await header("Pasul 1 din 2");
  await press(ro.capture.gallery);
  await header("Pasul 2 din 2");
  await press(ro.capture.gallery);
  await header(ro.review.title);
});
it("validates unclear OCR, fixes every marked field and creates a result", async () => {
  demoActions.setFlag("ocrUnclear", true);
  await renderRouter(routes);
  await press(ro.home.photoButton);
  await photoPair();
  expect(screen.getByText("Text neclar în 3 zone")).toBeTruthy();
  await press(ro.review.save);
  expect(screen.getAllByText(/^Verifică:/).length).toBeGreaterThan(0);
  const corrected = ocrFor(false);
  for (const [key, label] of [
    ["ingredients", ro.ingredients.title],
    ["kcal", ro.result.nutrients.kcal],
    ["sugar", ro.result.nutrients.sugar],
  ] as const)
    await fireEvent.changeText(screen.getByLabelText(label), corrected[key]);
  await fireEvent.changeText(
    screen.getByLabelText(ro.result.nutrients.sat),
    "31",
  );
  await press(ro.review.save);
  expect(
    screen.getAllByText(ro.app.design.saturatedError).length,
  ).toBeGreaterThan(0);
  await fireEvent.changeText(
    screen.getByLabelText(ro.result.nutrients.sat),
    "14",
  );
  await press(ro.review.save);
  await header(ro.result.title);
  await waitFor(() =>
    expect(screen.getByText(ro.result.unverified)).toBeTruthy(),
  );
});
it("opens a cached scan offline with its toast and permits back", async () => {
  demoActions.setFlag("offline", true);
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await press("Iaurt natural");
  await header(ro.result.title);
  expect(screen.getByText(ro.app.design.cached)).toBeTruthy();
  await back();
  await header(ro.scan.title);
});
it("retries an uncached scan offline and reconnects to confirmation", async () => {
  demoActions.clearHistory();
  demoActions.setFlag("offline", true);
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await press("Iaurt natural");
  await header(ro.offline.title);
  await press(ro.app.retry);
  expect(screen.getByText(ro.app.design.stillOffline)).toBeTruthy();
  await press(ro.app.design.reconnect);
  await header(ro.identify.confirm);
  expect(getDemoState().offline).toBe(false);
  await press(ro.identify.yes);
  await header(ro.result.title);
});
it("opens history from an offline lookup and resets safely through its tabs", async () => {
  demoActions.clearHistory();
  demoActions.setFlag("offline", true);
  await renderRouter(routes);
  await press(ro.app.design.primaryScan);
  await press(ro.app.design.unknown);
  await header(ro.offline.title);
  await press(ro.offline.history);
  await header(ro.history.title);
  await tab(ro.nav.home);
  await header("okBite");
  expect(router.canDismiss()).toBe(false);
});
it("collects only a table for a product with missing score and returns it pending", async () => {
  await renderRouter(routes, { initialUrl: `/product/${juiceId}` });
  await waitFor(() =>
    expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy(),
  );
  expect(screen.queryByRole("image")).toBeNull();
  await press(ro.app.design.tablePhoto);
  await header(ro.app.design.tableTitle);
  await press(ro.capture.take);
  await header(ro.review.title);
  await press(ro.review.save);
  await header(ro.result.title);
  await waitFor(() =>
    expect(screen.getByText(ro.app.design.pendingTable)).toBeTruthy(),
  );
  expect(screen.queryByRole("image")).toBeNull();
});
it("changes both comparison pickers and cycles every demo category safely", async () => {
  await renderRouter(routes, { initialUrl: "/compare" });
  await press(ro.app.design.changeB);
  expect(
    screen.getByRole("button", { name: "Produsul B: Iaurt grecesc 10%" }),
  ).toBeTruthy();
  await press("Produsul A: Iaurt natural 2,5%");
  await press("Biscuiți de ovăz cu ciocolată · Ovăzel");
  expect(
    screen.getByRole("button", {
      name: "Produsul A: Biscuiți de ovăz cu ciocolată",
    }),
  ).toBeTruthy();
  await press("Produsul B: Biscuiți integrali cu ovăz");
  await press("Biscuiți integrali cu ovăz · Morărița");
  await press(ro.app.design.otherCategory);
  expect(screen.getAllByText(ro.app.design.noPeer).length).toBeGreaterThan(0);
  await press(ro.app.design.otherCategory);
  expect(
    screen.getByRole("button", { name: "Produsul A: Iaurt natural 2,5%" }),
  ).toBeTruthy();
});
it("deletes individual history entries, cancels clearing, clears and restores demo history", async () => {
  await renderRouter(routes, { initialUrl: "/history" });
  await press("Șterge Iaurt cu căpșuni 2% din istoric");
  expect(getDemoState().history).toHaveLength(3);
  await press(ro.history.clear);
  await press(ro.app.cancel);
  expect(getDemoState().history).toHaveLength(3);
  await press(ro.history.clear);
  const clears = screen.getAllByRole("button", { name: ro.history.clear });
  await fireEvent.press(clears[clears.length - 1]);
  await header(ro.history.emptyTitle);
  expect(getDemoState().history).toHaveLength(0);
  await tab(ro.nav.home);
  await press(ro.app.design.demoTitle);
  await press(ro.app.design.restore);
  expect(getDemoState().history).toHaveLength(4);
});

it.each([
  ["/about", ro.nav.about],
  ["/privacy", ro.nav.privacy],
  ["/terms", ro.nav.terms],
  ["/method", ro.nav.method],
])("opens the informational route %s", async (initialUrl, title) => {
  await renderRouter(routes, { initialUrl });
  await header(title);
});

it("recovers from an unknown route through Home", async () => {
  await renderRouter(routes, { initialUrl: "/does-not-exist" });
  await header(ro.app.integrationTitle);
  await press(ro.nav.home);
  await header("okBite");
});

it("opens history safely when a product cannot be loaded", async () => {
  await renderRouter(routes, { initialUrl: "/product/not-a-product" });
  await waitFor(() =>
    expect(screen.getByText(ro.errors.not_found)).toBeTruthy(),
  );
  await press(ro.offline.history);
  await header(ro.history.title);
});
