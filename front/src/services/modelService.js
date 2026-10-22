export const MODEL_URL = "/models/yolov8n.onnx";

let resource;

// Inference runs in a Web Worker so the page stays responsive. The returned
// object keeps the `detect(canvas, options)` shape the processor relies on.
function startWorker(onProgress) {
  const worker = new Worker(new URL("./detector.worker.js", import.meta.url), {
    type: "module",
  });
  const pending = new Map();
  let nextId = 0;
  let failure;

  function fail(error) {
    failure = error;
    pending.forEach(({ reject }) => reject(error));
    pending.clear();
  }

  const promise = new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") onProgress(data.value);
      else if (data.type === "ready")
        resolve({
          backend: data.backend,
          detect(canvas, { minScore } = {}) {
            if (failure) return Promise.reject(failure);
            return createImageBitmap(canvas).then(
              (bitmap) =>
                new Promise((done, fault) => {
                  const id = nextId++;
                  pending.set(id, { resolve: done, reject: fault });
                  worker.postMessage({ type: "detect", id, bitmap, minScore }, [
                    bitmap,
                  ]);
                }),
            );
          },
          dispose() {
            worker.postMessage({ type: "dispose" });
            worker.terminate();
            fail(new Error("O modelo foi encerrado."));
          },
        });
      else if (data.type === "load-error") {
        worker.terminate();
        reject(new Error(data.message));
      } else if (data.type === "result") {
        const entry = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) entry?.reject(new Error(data.error));
        else entry?.resolve(data.people);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "Falha no worker do modelo.");
      worker.terminate();
      reject(error);
      fail(error);
    };
    worker.postMessage({ type: "load", modelUrl: MODEL_URL });
  });
  return promise;
}

// Share one load across consumers, including StrictMode's setup/cleanup replay.
export function acquireModel(onProgress) {
  if (!resource) {
    const created = {
      consumers: 0,
      timer: null,
      progress: 0,
      listeners: new Set(),
    };
    const report = (fraction) => {
      created.progress = fraction;
      created.listeners.forEach((listener) => listener(fraction));
    };
    created.promise = startWorker(report);
    resource = created;
  }
  const current = resource;
  current.consumers += 1;
  if (onProgress) {
    current.listeners.add(onProgress);
    onProgress(current.progress);
  }
  clearTimeout(current.timer);
  let released = false;
  return {
    promise: current.promise,
    release() {
      if (released) return;
      released = true;
      if (onProgress) current.listeners.delete(onProgress);
      current.consumers -= 1;
      if (current.consumers) return;
      current.timer = setTimeout(() => {
        if (current.consumers) return;
        if (resource === current) resource = undefined;
        current.promise.then(
          (model) => model.dispose(),
          () => {},
        );
      }, 0);
    },
  };
}
