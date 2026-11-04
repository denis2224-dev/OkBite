import { selectionAsync } from "expo-haptics";
export function pressFeedback() {
  void Promise.resolve(selectionAsync()).catch(() => {});
}
