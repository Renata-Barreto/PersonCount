import { loadDetector } from "./detectorLoader";

let detector;

function post(message) {
  self.postMessage(message);
}

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try {
      detector = await loadDetector(data.modelUrl, (value) =>
        post({ type: "progress", value }),
      );
      post({ type: "ready", backend: detector.backend });
    } catch (error) {
      post({ type: "load-error", message: error.message });
    }
  } else if (data.type === "detect") {
    try {
      const people = await detector.detect(data.bitmap, {
        minScore: data.minScore,
      });
      post({ type: "result", id: data.id, people });
    } catch (error) {
      post({ type: "result", id: data.id, error: error.message });
    } finally {
      data.bitmap.close();
    }
  } else if (data.type === "dispose") {
    detector?.dispose();
    detector = undefined;
  }
};
