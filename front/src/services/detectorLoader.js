import { createYoloDetector } from "./yoloDetector";

async function download(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Falha ao baixar o modelo (${response.status}).`);
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body || !total) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    onProgress(1);
    return buffer;
  }
  const reader = response.body.getReader();
  const buffer = new Uint8Array(total);
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer.set(value, received);
    received += value.length;
    onProgress(Math.min(received / total, 1));
  }
  return buffer;
}

async function hasWebGpu() {
  try {
    return Boolean(await navigator.gpu?.requestAdapter());
  } catch {
    return false;
  }
}

function hasWebGl() {
  try {
    return Boolean(new OffscreenCanvas(1, 1).getContext("webgl2"));
  } catch {
    return false;
  }
}

// The runtime's loader script and wasm are served as separate files (not
// inlined in the bundle), so each backend only downloads what it uses.
async function configure(ort, paths, threads) {
  const [{ default: wasm }, { default: mjs }] = await Promise.all(paths);
  ort.env.wasm.wasmPaths = { wasm, mjs };
  if (threads) ort.env.wasm.numThreads = threads; // no cross-origin isolation
}

// WebGPU is preferred, then WebGL (widely available, including Firefox). The
// WebGPU build cannot start without an adapter, even for CPU-only runs, so
// each backend uses its own build.
async function loadRuntime(allowGpu) {
  if (allowGpu && (await hasWebGpu())) {
    const ort = await import("onnxruntime-web/webgpu");
    await configure(ort, [
      import("onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url"),
      import("onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url"),
    ]);
    return { ort, backend: "gpu", providers: ["webgpu", "wasm"] };
  }
  if (allowGpu && hasWebGl()) {
    const ort = await import("onnxruntime-web/webgl");
    await configure(
      ort,
      [
        import("onnxruntime-web/ort-wasm-simd-threaded.wasm?url"),
        import("onnxruntime-web/ort-wasm-simd-threaded.mjs?url"),
      ],
      1,
    );
    return { ort, backend: "gpu", providers: ["webgl"] };
  }
  const ort = await import("onnxruntime-web/wasm");
  await configure(
    ort,
    [
      import("onnxruntime-web/ort-wasm-simd-threaded.wasm?url"),
      import("onnxruntime-web/ort-wasm-simd-threaded.mjs?url"),
    ],
    1,
  );
  return { ort, backend: "cpu", providers: ["wasm"] };
}

async function createDetector(bytes, allowGpu) {
  const { ort, backend, providers } = await loadRuntime(allowGpu);
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: providers,
  });
  const detector = createYoloDetector(session, ort.Tensor);
  detector.backend = backend;
  // Warm up so the first video sample is not slowed by initialization.
  try {
    await detector.detect(new OffscreenCanvas(640, 640));
  } catch (error) {
    detector.dispose();
    throw error;
  }
  return detector;
}

export async function loadDetector(modelUrl, onProgress) {
  const bytes = await download(modelUrl, onProgress);
  try {
    return await createDetector(bytes, true);
  } catch {
    // The GPU may exist but fail on this driver; the CPU always works.
    return createDetector(bytes, false);
  }
}
