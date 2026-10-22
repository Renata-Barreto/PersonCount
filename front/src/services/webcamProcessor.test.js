import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processWebcam } from "./webcamProcessor";
import { nextFrame } from "../utils/nextFrame";

vi.mock("../utils/nextFrame", () => ({ nextFrame: vi.fn() }));

describe("webcam detection", () => {
  let video;
  let track;
  let options;
  let controller;
  let ctx;
  let overlayCtx;

  beforeEach(() => {
    video = document.createElement("video");
    Object.defineProperties(video, {
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    video.play = vi.fn().mockResolvedValue();
    video.pause = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue(video);
    track = { stop: vi.fn() };
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }),
      },
    });
    ctx = { drawImage: vi.fn(), clearRect: vi.fn() };
    overlayCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };
    controller = new AbortController();
    options = {
      model: {
        detect: vi.fn().mockResolvedValue([
          { class: "person", score: 0.9, bbox: [1, 2, 3, 4] },
          { class: "chair", score: 0.9, bbox: [0, 0, 1, 1] },
        ]),
      },
      canvas: { getContext: () => ctx },
      overlay: { getContext: () => overlayCtx },
      signal: controller.signal,
      getMinScore: () => 0.6,
      onReady: vi.fn(),
      onCount: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("counts people live until stopped, then releases the camera", async () => {
    let frames = 0;
    nextFrame.mockImplementation(async () => {
      if (++frames === 3) controller.abort();
    });
    await processWebcam(options);
    expect(options.onReady).toHaveBeenCalledOnce();
    expect(options.onCount.mock.calls.flat()).toEqual([1, 1, 1]);
    expect(options.model.detect).toHaveBeenCalledWith(options.canvas, {
      minScore: 0.6,
    });
    expect(overlayCtx.rect).toHaveBeenCalledTimes(3);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(options.canvas.width).toBe(640);
  });

  it("applies the confidence value current at each frame", async () => {
    let score = 0.5;
    options.getMinScore = () => score;
    let frames = 0;
    nextFrame.mockImplementation(async () => {
      score = 0.8;
      if (++frames === 2) controller.abort();
    });
    await processWebcam(options);
    expect(options.model.detect.mock.calls.map(([, o]) => o.minScore)).toEqual([
      0.5, 0.8,
    ]);
  });

  it.each([
    ["NotAllowedError", "Permissão da câmera negada"],
    ["NotFoundError", "Nenhuma webcam"],
    ["NotReadableError", "em uso por outro aplicativo"],
    ["AbortError", "Não foi possível acessar a webcam"],
  ])("explains %s", async (name, message) => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(
      Object.assign(new Error("x"), { name }),
    );
    await expect(processWebcam(options)).rejects.toThrow(message);
    expect(options.onReady).not.toHaveBeenCalled();
  });

  it("explains missing camera support", async () => {
    vi.stubGlobal("navigator", {});
    await expect(processWebcam(options)).rejects.toThrow("HTTPS ou localhost");
  });

  it("releases the camera when stopped before playback starts", async () => {
    video.play.mockImplementation(async () => controller.abort());
    await expect(processWebcam(options)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(options.onReady).not.toHaveBeenCalled();
  });
});
