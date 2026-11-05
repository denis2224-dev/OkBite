import { render, screen, fireEvent, act } from "@testing-library/react-native";
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

it("hides notices after 2.8 seconds", async () => {
  jest.useFakeTimers();
  function Trigger() {
    const toast = useToast();
    return <Button onPress={() => toast("Mesaj temporar")}>Arată</Button>;
  }
  await render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Arată" }));
  expect(screen.getByText("Mesaj temporar")).toBeTruthy();
  await act(() => {
    jest.advanceTimersByTime(2799);
  });
  expect(screen.getByText("Mesaj temporar")).toBeTruthy();
  await act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.queryByText("Mesaj temporar")).toBeNull();
  jest.useRealTimers();
});
