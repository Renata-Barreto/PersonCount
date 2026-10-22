import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processVideo } from "./videoProcessor";
import { uploadHistory } from "./historyApi";
import { nextFrame } from "../utils/nextFrame";

vi.mock("../utils/nextFrame", () => ({ nextFrame: vi.fn() }));
vi.mock("./historyApi", () => ({ uploadHistory: vi.fn() }));

describe("browser video processing", () => {
  let video;
  let canvas;
  let overlay;
  let controller;
  let options;

  beforeEach(() => {
    video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { value: 2, configurable: true },
      videoWidth: { value: 640 },
      videoHeight: { value: 360 },
      currentTime: { value: 0, writable: true },
      ended: { value: false, writable: true },
      paused: { value: true, writable: true },
    });
    video.play = vi.fn(async () => {
      video.paused = false;
    });
    video.pause = vi.fn(() => {
      video.paused = true;
    });
    video.load = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue(video);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
    const ctx = {
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };
    const overlayCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };
    canvas = { getContext: () => ctx };
    overlay = { getContext: () => overlayCtx };
    controller = new AbortController();
    options = {
      file: new File(["video"], "test.mp4", { type: "video/mp4" }),
      canvas,
      overlay,
      signal: controller.signal,
      onStatus: vi.fn(),
      onSaveError: vi.fn(),
      model: { detect: vi.fn().mockResolvedValue([]) },
    };
    uploadHistory.mockResolvedValue({ status: "ok" });
    nextFrame.mockImplementation(async () => {
      video.ended = true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("filters people, draws confidence labels and sends complete sequential snapshots", async () => {
    options.model.detect.mockResolvedValue([
      { class: "person", score: 0.956, bbox: [10, 20, 30, 40] },
      { class: "car", score: 0.99, bbox: [0, 0, 10, 10] },
    ]);
    let samples = 0;
    nextFrame.mockImplementation(async () => {
      if (++samples === 2) video.ended = true;
    });
    const history = await processVideo(options);
    expect(history).toEqual([
      { idFrame: 0, tempo: 0, personCount: 1 },
      { idFrame: 1, tempo: 0, personCount: 1 },
    ]);
    expect(uploadHistory.mock.calls.map(([snapshot]) => snapshot)).toEqual([
      [history[0]],
      history,
    ]);
    expect(overlay.getContext().rect).toHaveBeenCalledTimes(2);
    expect(overlay.getContext().fillText).toHaveBeenCalledWith(
      "person - 96%",
      10,
      15,
    );
    expect(options.onStatus.mock.calls.flat()).toEqual([
      "processing",
      "saving",
    ]);
    expect(canvas.width).toBe(640);
    expect(overlay.width).toBe(640);
    expect(overlay.getContext().clearRect).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(video.pause).toHaveBeenCalled();
    expect(video.getAttribute("src")).toBeNull();
  });

  it("records the video time and forwards the chosen thresholds", async () => {
    video.currentTime = 1.236;
    options.minScore = 0.7;
    options.alertThreshold = 5;
    const history = await processVideo(options);
    expect(history[0].tempo).toBe(1.24);
    expect(options.model.detect).toHaveBeenCalledWith(canvas, {
      minScore: 0.7,
    });
    expect(uploadHistory).toHaveBeenCalledWith(
      [history[0]],
      controller.signal,
      {
        alertThreshold: 5,
      },
    );
  });

  it("keeps zero-count samples and waits for the final save", async () => {
    let finishSave;
    uploadHistory.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    let finished = false;
    const processing = processVideo(options).then((history) => {
      finished = true;
      return history;
    });
    await vi.waitFor(() =>
      expect(options.onStatus).toHaveBeenCalledWith("saving"),
    );
    expect(finished).toBe(false);
    finishSave({ status: "ok" });
    expect(await processing).toEqual([
      { idFrame: 0, tempo: 0, personCount: 0 },
    ]);
  });

  it("retains analysis results when persistence fails", async () => {
    uploadHistory.mockRejectedValue(new Error("offline"));
    expect(await processVideo(options)).toEqual([
      { idFrame: 0, tempo: 0, personCount: 0 },
    ]);
    expect(options.onSaveError).toHaveBeenCalledOnce();
  });

  it("cleans up when playback is rejected", async () => {
    video.play.mockRejectedValue(new Error("Unsupported codec"));
    await expect(processVideo(options)).rejects.toThrow("Unsupported codec");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(video.pause).toHaveBeenCalled();
    expect(uploadHistory).not.toHaveBeenCalled();
  });

  it("rejects invalid video and cleans up pending listeners", async () => {
    Object.defineProperty(video, "readyState", { value: 0 });
    const processing = processVideo(options);
    video.dispatchEvent(new Event("error"));
    await expect(processing).rejects.toThrow("Não foi possível abrir o vídeo");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("does not save or draw predictions that resolve after unmount", async () => {
    options.model.detect.mockImplementation(async () => {
      controller.abort();
      return [{ class: "person", score: 0.9, bbox: [0, 0, 10, 10] }];
    });
    await expect(processVideo(options)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(uploadHistory).not.toHaveBeenCalled();
    expect(overlay.getContext().rect).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
