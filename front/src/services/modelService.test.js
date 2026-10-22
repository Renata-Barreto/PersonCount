import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireModel } from "./modelService";

let workers;

class FakeWorker {
  constructor() {
    this.postMessage = vi.fn((message) => {
      if (message.type === "load") this.onLoad?.(message);
      if (message.type === "detect") this.onDetect?.(message);
    });
    this.terminate = vi.fn();
    workers.push(this);
  }
  emit(data) {
    this.onmessage({ data });
  }
}

beforeEach(() => {
  workers = [];
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ id: "bmp" }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function ready(resource, backend = "gpu") {
  await vi.advanceTimersByTimeAsync(0);
  workers.at(-1).emit({ type: "ready", backend });
  return resource.promise;
}

describe("worker-backed model", () => {
  it("loads once for StrictMode replays and terminates after the last release", async () => {
    const first = acquireModel();
    first.release();
    const second = acquireModel();
    const model = await ready(second);
    expect(workers).toHaveLength(1);
    expect(model.backend).toBe("gpu");
    await vi.runAllTimersAsync();
    expect(workers[0].terminate).not.toHaveBeenCalled();
    second.release();
    second.release();
    await vi.runAllTimersAsync();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("reports progress, including to late subscribers", async () => {
    const early = vi.fn();
    const first = acquireModel(early);
    await vi.advanceTimersByTimeAsync(0);
    workers[0].emit({ type: "progress", value: 0.5 });
    const late = vi.fn();
    const second = acquireModel(late);
    expect(early).toHaveBeenLastCalledWith(0.5);
    expect(late).toHaveBeenCalledWith(0.5);
    await ready(first);
    first.release();
    workers[0].emit({ type: "progress", value: 1 });
    expect(early).not.toHaveBeenCalledWith(1);
    expect(late).toHaveBeenLastCalledWith(1);
    second.release();
    await vi.runAllTimersAsync();
  });

  it("sends frames to the worker and returns its detections", async () => {
    const resource = acquireModel();
    const model = await ready(resource);
    workers[0].onDetect = ({ id }) =>
      workers[0].emit({
        type: "result",
        id,
        people: [{ class: "person", score: 0.9, bbox: [1, 2, 3, 4] }],
      });
    const canvas = {};
    const people = await model.detect(canvas, { minScore: 0.6 });
    expect(people).toHaveLength(1);
    expect(createImageBitmap).toHaveBeenCalledWith(canvas);
    const [message, transfer] = workers[0].postMessage.mock.calls.at(-1);
    expect(message).toMatchObject({ type: "detect", minScore: 0.6 });
    expect(transfer).toEqual([{ id: "bmp" }]);
    resource.release();
    await vi.runAllTimersAsync();
  });

  it("rejects detections that fail in the worker", async () => {
    const resource = acquireModel();
    const model = await ready(resource);
    workers[0].onDetect = ({ id }) =>
      workers[0].emit({ type: "result", id, error: "boom" });
    await expect(model.detect({})).rejects.toThrow("boom");
    resource.release();
    await vi.runAllTimersAsync();
  });

  it("rejects when loading fails", async () => {
    const resource = acquireModel();
    await vi.advanceTimersByTimeAsync(0);
    workers[0].emit({ type: "load-error", message: "404" });
    await expect(resource.promise).rejects.toThrow("404");
    expect(workers[0].terminate).toHaveBeenCalled();
    resource.release();
    await vi.runAllTimersAsync();
  });
});
