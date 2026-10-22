const INPUT_SIZE = 640;
const PERSON_CHANNEL = 4; // YOLOv8 output rows: cx, cy, w, h, then class scores
const SCORE_THRESHOLD = 0.4;
const IOU_THRESHOLD = 0.45;
const PAD_COLOR = "rgb(114, 114, 114)";

function iou(a, b) {
  const x1 = Math.max(a.bbox[0], b.bbox[0]);
  const y1 = Math.max(a.bbox[1], b.bbox[1]);
  const x2 = Math.min(a.bbox[0] + a.bbox[2], b.bbox[0] + b.bbox[2]);
  const y2 = Math.min(a.bbox[1] + a.bbox[3], b.bbox[1] + b.bbox[3]);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.bbox[2] * a.bbox[3] + b.bbox[2] * b.bbox[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

function suppress(candidates) {
  const kept = [];
  [...candidates]
    .sort((a, b) => b.score - a.score)
    .forEach((candidate) => {
      if (kept.every((other) => iou(candidate, other) < IOU_THRESHOLD))
        kept.push(candidate);
    });
  return kept;
}

// Turns the [1, 84, N] YOLOv8 output into person boxes in source-image pixels.
export function decodePeople(
  data,
  count,
  { scale, padX, padY, width, height },
  minScore = SCORE_THRESHOLD,
) {
  const candidates = [];
  for (let i = 0; i < count; i += 1) {
    const score = data[PERSON_CHANNEL * count + i];
    if (score < minScore) continue;
    const cx = data[i];
    const cy = data[count + i];
    const w = data[2 * count + i];
    const h = data[3 * count + i];
    const x1 = Math.max(0, (cx - w / 2 - padX) / scale);
    const y1 = Math.max(0, (cy - h / 2 - padY) / scale);
    const x2 = Math.min(width, (cx + w / 2 - padX) / scale);
    const y2 = Math.min(height, (cy + h / 2 - padY) / scale);
    if (x2 <= x1 || y2 <= y1) continue;
    candidates.push({
      bbox: [x1, y1, x2 - x1, y2 - y1],
      class: "person",
      score,
    });
  }
  return suppress(candidates);
}

export function createYoloDetector(session, Tensor) {
  // Runs inside a Web Worker, so there is no document to create canvases from.
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const input = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;

  return {
    async detect(source, { minScore } = {}) {
      const width = source.videoWidth || source.width;
      const height = source.videoHeight || source.height;
      const scale = Math.min(INPUT_SIZE / width, INPUT_SIZE / height);
      const padX = (INPUT_SIZE - width * scale) / 2;
      const padY = (INPUT_SIZE - height * scale) / 2;
      ctx.fillStyle = PAD_COLOR;
      ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      ctx.drawImage(source, padX, padY, width * scale, height * scale);
      const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
      for (let i = 0; i < plane; i += 1) {
        input[i] = data[4 * i] / 255;
        input[plane + i] = data[4 * i + 1] / 255;
        input[2 * plane + i] = data[4 * i + 2] / 255;
      }
      const tensor = new Tensor("float32", input, [
        1,
        3,
        INPUT_SIZE,
        INPUT_SIZE,
      ]);
      const outputs = await session.run({ [session.inputNames[0]]: tensor });
      const output = outputs[session.outputNames[0]];
      try {
        return decodePeople(
          output.data,
          output.dims[2],
          { scale, padX, padY, width, height },
          minScore,
        );
      } finally {
        output.dispose?.();
      }
    },
    dispose() {
      return session.release?.();
    },
  };
}
