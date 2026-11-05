import {
  focusActiveScreen,
  observeScreenFocus,
} from "../../../src/core/services/navigation_focus.web";

afterEach(() => {
  document.body.innerHTML = "";
});
it("moves focus from a hidden previous screen into the current screen", () => {
  document.body.innerHTML =
    '<div id="old"><button>Scan</button></div><main tabindex="-1">Scanner</main>';
  document.querySelector("button").focus();
  document.getElementById("old").setAttribute("aria-hidden", "true");
  focusActiveScreen();
  expect(document.activeElement).toBe(document.querySelector("main"));
});
it("keeps focus on a visible tab button", () => {
  document.body.innerHTML =
    '<button>Compară</button><main tabindex="-1">Comparație</main>';
  const tab = document.querySelector("button");
  tab.focus();
  focusActiveScreen();
  expect(document.activeElement).toBe(tab);
});
it("ignores hidden screen panels when choosing the active screen", () => {
  document.body.innerHTML =
    '<div aria-hidden="true"><main tabindex="-1">Home</main></div><main id="active" tabindex="-1">Result</main><div inert><main tabindex="-1">History</main></div>';
  focusActiveScreen();
  expect(document.activeElement).toBe(document.getElementById("active"));
});

it("transfers focus as navigation hides the previous screen", async () => {
  document.body.innerHTML =
    '<div id="old"><button>Scan</button></div><main tabindex="-1">Scanner</main>';
  const stop = observeScreenFocus();
  try {
    document.querySelector("button").focus();
    document.getElementById("old").setAttribute("aria-hidden", "true");
    await Promise.resolve();
    expect(document.activeElement).toBe(document.querySelector("main"));
  } finally {
    stop();
  }
});
