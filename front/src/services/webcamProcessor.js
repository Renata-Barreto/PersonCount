import { nextFrame } from "../utils/nextFrame";
import { getPeople, drawDetections } from "../utils/detections";

function cameraError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nenhuma webcam foi encontrada neste dispositivo.";
    case "NotReadableError":
      return "A webcam está em uso por outro aplicativo.";
    default:
      return "Não foi possível acessar a webcam.";
  }
}

// Detects people on the live camera until `signal` aborts. Nothing is saved or
// sent anywhere: each result only updates the canvas and the live count.
export async function processWebcam({
  model,
  canvas,
  overlay,
  signal,
  getMinScore,
  onReady,
  onCount,
}) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Este navegador não permite usar a webcam (é preciso HTTPS ou localhost).",
    );
  signal.throwIfAborted();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 } },
      audio: false,
    });
  } catch (error) {
    throw new Error(cameraError(error));
  }
  const video = document.createElement("video");
  let ctx;
  let overlayCtx;
  try {
    signal.throwIfAborted();
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    signal.throwIfAborted();
    canvas.width = overlay.width = video.videoWidth;
    canvas.height = overlay.height = video.videoHeight;
    ctx = canvas.getContext("2d");
    overlayCtx = overlay.getContext("2d");
    if (!ctx || !overlayCtx)
      throw new Error("Seu navegador não oferece suporte à visualização.");
    onReady();
    while (!signal.aborted) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const predictions = await model.detect(canvas, {
        minScore: getMinScore(),
      });
      if (signal.aborted) break;
      const people = getPeople(predictions);
      overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      drawDetections(overlayCtx, people);
      onCount(people.length);
      await nextFrame();
    }
  } finally {
    // Release the camera so the browser's "in use" indicator turns off.
    stream.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
    // Don't leave the last camera frame on screen.
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx?.clearRect(0, 0, overlay.width, overlay.height);
  }
}
