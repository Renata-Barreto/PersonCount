import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chart } from "chart.js";
import ResultsChart from "./ResultsChart";

vi.mock("chart.js", () => {
  const Chart = vi.fn(function () {
    this.destroy = vi.fn();
  });
  Chart.register = vi.fn();
  return {
    Chart,
    LineController: {},
    LineElement: {},
    PointElement: {},
    CategoryScale: {},
    LinearScale: {},
    Filler: {},
    Tooltip: {},
    Legend: {},
  };
});

describe("results chart lifecycle", () => {
  it("maps the history and destroys replaced charts, including StrictMode replay", () => {
    const history = [
      { idFrame: 0, personCount: 2 },
      { idFrame: 1, personCount: 0 },
    ];
    const { rerender, unmount } = render(
      <StrictMode>
        <ResultsChart history={history} />
      </StrictMode>,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/2 amostras/);
    const config = Chart.mock.calls.at(-1)[1];
    expect(config.data.labels).toEqual([0, 1]);
    expect(config.data.datasets[0].data).toEqual([2, 0]);
    rerender(
      <StrictMode>
        <ResultsChart history={null} />
      </StrictMode>,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    unmount();
    for (const chart of Chart.mock.instances)
      expect(chart.destroy).toHaveBeenCalledOnce();
  });
});
