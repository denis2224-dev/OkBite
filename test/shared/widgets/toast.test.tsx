import { render, screen, fireEvent } from "@testing-library/react-native";
import { ToastProvider, useToast } from "../../../src/shared/widgets/toast";
import { Button } from "../../../src/shared/widgets/app_button";
it("offers an accessible action on a recovery message", async () => {
  const open = jest.fn();
  function Trigger() {
    const toast = useToast();
    return (
      <Button
        onPress={() =>
          toast("Produs pregătit", {
            label: "Deschide produsul",
            onPress: open,
          })
        }
      >
        Arată mesajul
      </Button>
    );
  }
  await render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Arată mesajul" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Deschide produsul" }),
  );
  expect(open).toHaveBeenCalledTimes(1);
});
