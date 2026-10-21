import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChartPanel } from "@phoenix/components/chart";

let container: HTMLDivElement;
let root: Root;

function renderPanel(element: React.ReactElement) {
  act(() => {
    root.render(element);
  });
  const panel = container.querySelector('[data-testid="chart-panel"]');
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("ChartPanel", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the title accessory in the header, before the actions", () => {
    const panel = renderPanel(
      <ChartPanel
        title="hallucination_rate"
        titleAccessory={<span data-testid="accessory">Trending worse</span>}
        actions={<button>View</button>}
      >
        <div />
      </ChartPanel>
    );

    const header = panel.querySelector(".chart-panel__header");
    const accessory = header?.querySelector(".chart-panel__title-accessory");
    expect(accessory?.textContent).toBe("Trending worse");
    expect(accessory?.nextElementSibling?.className).toBe(
      "chart-panel__actions"
    );
  });

  it("renders the aside after the main column", () => {
    const panel = renderPanel(
      <ChartPanel title="hallucination_rate" aside={<div>tab</div>}>
        <div data-testid="chart" />
      </ChartPanel>
    );

    const [main, aside] = Array.from(panel.children);
    expect(main.className).toBe("chart-panel__main");
    expect(main.querySelector(".chart-panel__header")).not.toBeNull();
    expect(main.querySelector('[data-testid="chart"]')).not.toBeNull();
    expect(aside.className).toBe("chart-panel__aside");
    expect(aside.textContent).toBe("tab");
  });

  it("keeps the header and chart as direct children without an aside", () => {
    const panel = renderPanel(
      <ChartPanel title="helpfulness">
        <div />
      </ChartPanel>
    );

    expect(
      Array.from(panel.children).map(({ className }) => className)
    ).toEqual(["chart-panel__header", "chart-panel__chart"]);
    expect(panel.querySelector(".chart-panel__title-accessory")).toBeNull();
  });
});
