import { afterEach, describe, expect, it, vi } from "vitest";
import { acquireModel } from "./modelService";
import * as tf from "@tensorflow/tfjs";

vi.mock("@tensorflow/tfjs", () => ({
  ready: vi.fn().mockResolvedValue(),
  loadGraphModel: vi.fn(),
  zeros: vi.fn(() => ({ dispose: vi.fn() })),
}));
vi.mock("@tensorflow-models/coco-ssd", () => ({
  ObjectDetection: vi.fn(function () {
    this.detect = vi.fn().mockResolvedValue([]);
    this.dispose = vi.fn();
  }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(tf.loadGraphModel).mockReset();
});

describe("shared model lifecycle", () => {
  it("disposes once when multiple consumers release in the same turn", async () => {
    vi.useFakeTimers();
    tf.loadGraphModel.mockResolvedValue({});
    const first = acquireModel();
    const second = acquireModel();
    const model = await first.promise;
    first.release();
    second.release();
    await vi.runAllTimersAsync();
    expect(model.dispose).toHaveBeenCalledOnce();
  });

  it("shares the StrictMode load and disposes after the last consumer leaves", async () => {
    vi.useFakeTimers();
    tf.loadGraphModel.mockResolvedValue({});
    const first = acquireModel();
    first.release();
    const second = acquireModel();
    const model = await second.promise;
    expect(tf.loadGraphModel).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    expect(model.dispose).not.toHaveBeenCalled();
    second.release();
    second.release();
    await vi.runAllTimersAsync();
    expect(model.dispose).toHaveBeenCalledOnce();
  });

  it("disposes a pending load when its consumer unmounts", async () => {
    vi.useFakeTimers();
    let finish;
    tf.loadGraphModel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const resource = acquireModel();
    await vi.advanceTimersByTimeAsync(0);
    resource.release();
    await vi.runAllTimersAsync();
    finish({});
    const model = await resource.promise;
    expect(model.dispose).toHaveBeenCalledOnce();
  });

  it("reports download progress, including to late subscribers", async () => {
    vi.useFakeTimers();
    let options;
    tf.loadGraphModel.mockImplementation((url, opts) => {
      options = opts;
      return Promise.resolve({});
    });
    const early = vi.fn();
    const first = acquireModel(early);
    await vi.advanceTimersByTimeAsync(0);
    options.onProgress(0.5);
    const late = vi.fn();
    const second = acquireModel(late);
    expect(early).toHaveBeenLastCalledWith(0.5);
    expect(late).toHaveBeenCalledWith(0.5);
    await first.promise;
    first.release();
    options.onProgress(1);
    expect(early).not.toHaveBeenCalledWith(1);
    expect(late).toHaveBeenLastCalledWith(1);
    second.release();
    await vi.runAllTimersAsync();
  });
});
