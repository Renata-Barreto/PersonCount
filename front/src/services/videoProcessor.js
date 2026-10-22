import { nextFrame } from "../utils/nextFrame";
import { uploadHistory } from "./historyApi";
import { getPeople, drawDetections } from "../utils/detections";

function waitForVideo(video, signal) {
  return new Promise((resolve, reject) => {
    function cleanup() {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    }
    function onReady() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(
        new Error(
          "Não foi possível abrir o vídeo. Verifique o formato do arquivo.",
        ),
      );
    }
    function onAbort() {
      cleanup();
      reject(new DOMException("Processamento interrompido.", "AbortError"));
    }
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    else if (video.readyState >= 2) onReady();
  });
}

export async function processVideo({
  file,
  model,
  canvas,
  overlay,
  signal,
  onStatus,
  onSaveError,
  minScore,
  alertThreshold,
}) {
  signal.throwIfAborted();
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  const history = [];
  let saves = Promise.resolve();
  const pause = () => video.pause();
  signal.addEventListener("abort", pause, { once: true });
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const ready = waitForVideo(video, signal);
    video.src = url;
    await ready;
    signal.throwIfAborted();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Boxes live on their own layer so drawing the next video frame never
    // wipes them before they are painted; they stay until the next detection.
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const overlayCtx = overlay.getContext("2d");
    if (!ctx || !overlayCtx)
      throw new Error(
        "Seu navegador não oferece suporte à visualização do vídeo.",
      );
    await video.play();
    signal.throwIfAborted();
    onStatus("processing");
    while (!video.ended && !video.paused) {
      signal.throwIfAborted();
      if (video.error)
        throw new Error(
          "O navegador não conseguiu continuar a reprodução deste vídeo.",
        );
      const tempo = Math.round(video.currentTime * 100) / 100;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const predictions = await model.detect(canvas, { minScore });
      signal.throwIfAborted();
      const people = getPeople(predictions);
      history.push({
        idFrame: history.length,
        tempo,
        personCount: people.length,
      });
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      drawDetections(overlayCtx, people);
      // Keep the existing full-history payload for each sample, in order.
      // Uploads run independently of inference and finish before the next run.
      const snapshot = history.slice();
      saves = saves
        .then(() => {
          signal.throwIfAborted();
          return uploadHistory(snapshot, signal, { alertThreshold });
        })
        .catch(() => {
          if (!signal.aborted) onSaveError();
        });
      await nextFrame();
    }
    signal.throwIfAborted();
    if (video.error)
      throw new Error(
        "O navegador não conseguiu concluir a reprodução deste vídeo.",
      );
    onStatus("saving");
    await saves;
    signal.throwIfAborted();
    return history;
  } finally {
    signal.removeEventListener("abort", pause);
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    await saves;
  }
}
