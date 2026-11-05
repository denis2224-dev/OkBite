import "../../helpers/sqlite";
import { render, screen, waitFor } from "@testing-library/react-native";
import { DetailsPreview } from "../../../src/features/ingredients/ingredients_screen";
import { saveToHistory } from "../../../src/data/repositories/history_repository";
import { foundYogurt } from "../../../src/data/mock/mock_products";
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
it("opens the actual saved product rather than an unrelated example", async () => {
  const product = {
    ...foundYogurt.product,
    id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e7f",
    name: "Napolitane cu cremă de cacao",
    ingredientsText: "făină, cacao",
  };
  await saveToHistory({ product, score: foundYogurt.score });
  await render(<DetailsPreview kind="label" id={product.id} />);
  await waitFor(() => expect(screen.getByText(product.name)).toBeTruthy());
  expect(screen.getByText("făină, cacao")).toBeTruthy();
  expect(screen.queryByText(foundYogurt.product.name)).toBeNull();
});
