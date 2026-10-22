import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDetector } from "./detectorLoader";
import { createYoloDetector } from "./yoloDetector";

const runtime = () => ({
  env: { wasm: {} },
  Tensor: vi.fn(),
  InferenceSession: { create: vi.fn().mockResolvedValue({}) },
});
vi.mock("onnxruntime-web/webgpu", () => runtime());
vi.mock("onnxruntime-web/webgl", () => runtime());
vi.mock("onnxruntime-web/wasm", () => runtime());
vi.mock("onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url", () => ({
  default: "/jsep.wasm",
}));
vi.mock("onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url", () => ({
  default: "/jsep.mjs",
}));
vi.mock("onnxruntime-web/ort-wasm-simd-threaded.wasm?url", () => ({
  default: "/ort.wasm",
}));
vi.mock("onnxruntime-web/ort-wasm-simd-threaded.mjs?url", () => ({
  default: "/ort.mjs",
}));
vi.mock("./yoloDetector", () => ({ createYoloDetector: vi.fn() }));

let webgl;

beforeEach(() => {
  webgl = null;
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      getContext() {
        return webgl;
      }
    },
  );
  vi.stubGlobal("navigator", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function stubFetch(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const reader = {
    read: vi.fn(async () =>
      chunks.length
        ? { done: false, value: chunks.shift() }
        : { done: true, value: undefined },
    ),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => String(total) },
      body: { getReader: () => reader },
    }),
  );
}

function stubDetector() {
  const detector = { detect: vi.fn().mockResolvedValue([]), dispose: vi.fn() };
  createYoloDetector.mockReturnValue(detector);
  return detector;
}

describe("detector loading", () => {
  it("reports download progress", async () => {
    stubFetch([new Uint8Array(2), new Uint8Array(2)]);
    stubDetector();
    const progress = vi.fn();
    await loadDetector("/model.onnx", progress);
    expect(progress.mock.calls.map(([value]) => value)).toEqual([0.5, 1]);
  });

  it("uses WebGPU when an adapter exists", async () => {
    stubFetch([new Uint8Array(4)]);
    stubDetector();
    vi.stubGlobal("navigator", {
      gpu: { requestAdapter: vi.fn().mockResolvedValue({}) },
    });
    expect((await loadDetector("/m", vi.fn())).backend).toBe("gpu");
  });

  it("uses WebGL when WebGPU is missing", async () => {
    stubFetch([new Uint8Array(4)]);
    stubDetector();
    webgl = {};
    expect((await loadDetector("/m", vi.fn())).backend).toBe("gpu");
  });

  it("uses the CPU when no GPU API exists", async () => {
    stubFetch([new Uint8Array(4)]);
    stubDetector();
    expect((await loadDetector("/m", vi.fn())).backend).toBe("cpu");
  });

  it("falls back to the CPU when the GPU backend fails to start", async () => {
    stubFetch([new Uint8Array(4)]);
    const detector = stubDetector();
    detector.detect
      .mockRejectedValueOnce(new Error("webgl failed"))
      .mockResolvedValue([]);
    webgl = {};
    expect((await loadDetector("/m", vi.fn())).backend).toBe("cpu");
    expect(detector.dispose).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects when the model file cannot be downloaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    await expect(loadDetector("/m", vi.fn())).rejects.toThrow("404");
  });
});
