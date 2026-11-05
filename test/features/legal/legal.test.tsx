import { render, screen } from "@testing-library/react-native";
import { LegalContent } from "../../../src/features/legal/legal_content";
import { ro } from "../../../src/core/constants/strings_ro";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
it.each(["about", "privacy", "terms", "method"] as const)(
  "renders %s with an update date",
  async (kind) => {
    await render(<LegalContent kind={kind} />);
    expect(screen.getByText(ro.legal.updated + ": 04.11.2026")).toBeTruthy();
    expect(screen.getByRole("header", { name: ro.nav[kind] })).toBeTruthy();
  },
);
it("explains photo handling and the random device identifier", async () => {
  await render(<LegalContent kind="privacy" />);
  expect(screen.getByText(/Anthropic/)).toBeTruthy();
  expect(screen.getByText(/identificator aleatoriu/)).toBeTruthy();
});
it("keeps the score disclaimer on the method page", async () => {
  await render(<LegalContent kind="method" />);
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
});
