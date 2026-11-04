jest.mock("expo-router", () => ({ router: {} }));
import { renderToStaticMarkup } from "react-dom/server.node";
import { Icon } from "../../../src/shared/widgets/app_icon";
import { Pack } from "../../../src/shared/widgets/product_pack";
import { ScoreRing } from "../../../src/features/result/widgets/score_gauge";
import { ScannerScreen } from "../../../src/features/scanner/scanner_screen";
import { previewEntries } from "../../../src/data/mock/mock_products";

let errors;
beforeEach(() => {
  errors = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
});

it("renders decorative icons without invalid DOM attributes", () => {
  const html = renderToStaticMarkup(<Icon name="tag" />);
  expect(html).toContain('aria-hidden="true"');
  expect(errors).not.toHaveBeenCalled();
});

it("renders every product illustration without invalid DOM attributes", () => {
  for (const entry of [
    previewEntries[0],
    previewEntries[3],
    previewEntries[5],
  ]) {
    const html = renderToStaticMarkup(<Pack product={entry.product} />);
    expect(html).toContain("<svg");
    expect(html).not.toContain("ariaHidden");
  }
  expect(errors).not.toHaveBeenCalled();
});

it("renders an accessible score with its ring rotated without invalid DOM attributes", () => {
  const html = renderToStaticMarkup(<ScoreRing score={78} grade="good" />);
  expect(html).toContain("78 din 100, calitate nutrițională bună");
  expect(html).toContain("rotate(-90 64 64)");
  expect(errors).not.toHaveBeenCalled();
});

it("renders the scanner barcode without invalid DOM attributes", () => {
  const html = renderToStaticMarkup(
    <ScannerScreen
      code=""
      setCode={() => {}}
      setError={() => {}}
      findCode={() => {}}
      onExample={() => {}}
    />,
  );
  expect(html).toContain("<svg");
  expect(errors).not.toHaveBeenCalled();
});
