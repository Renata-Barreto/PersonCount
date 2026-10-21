import * as tf from "@tensorflow/tfjs";
import { ObjectDetection } from "@tensorflow-models/coco-ssd";

const BASE = "lite_mobilenet_v2";
const MODEL_URL = `https://storage.googleapis.com/tfjs-models/savedmodel/ssd${BASE}/model.json`;

// coco-ssd's load() hides the download, so load the graph ourselves to get
// progress and hand it to the detector (the same steps its load() performs).
async function loadWithProgress(onProgress) {
  const detector = new ObjectDetection(BASE, MODEL_URL);
  detector.model = await tf.loadGraphModel(MODEL_URL, { onProgress });
  const warmup = tf.zeros([300, 300, 3], "int32");
  try {
    await detector.detect(warmup);
  } finally {
    warmup.dispose();
  }
  return detector;
}

let resource;

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
    created.promise = tf.ready().then(() => loadWithProgress(report));
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
