import { describe, expect, it } from "vitest";
import { decodePeople } from "./yoloDetector";

// Builds a [1, 84, count] output with only the box and person rows filled.
function output(count, boxes) {
  const data = new Float32Array(84 * count);
  boxes.forEach(({ cx, cy, w, h, score }, i) => {
    data[i] = cx;
    data[count + i] = cy;
    data[2 * count + i] = w;
    data[3 * count + i] = h;
    data[4 * count + i] = score;
  });
  return data;
}

const identity = { scale: 1, padX: 0, padY: 0, width: 640, height: 640 };

describe("YOLOv8 person decoding", () => {
  it("returns person boxes as [x, y, width, height]", () => {
    const data = output(3, [{ cx: 100, cy: 200, w: 40, h: 80, score: 0.9 }]);
    expect(decodePeople(data, 3, identity)).toEqual([
      { bbox: [80, 160, 40, 80], class: "person", score: expect.closeTo(0.9) },
    ]);
  });

  it("drops low-confidence candidates", () => {
    const data = output(2, [{ cx: 100, cy: 100, w: 40, h: 40, score: 0.2 }]);
    expect(decodePeople(data, 2, identity)).toEqual([]);
  });

  it("keeps one box per overlapping detection and counts separate people", () => {
    const data = output(3, [
      { cx: 100, cy: 100, w: 50, h: 100, score: 0.9 },
      { cx: 102, cy: 101, w: 50, h: 100, score: 0.8 },
      { cx: 400, cy: 300, w: 50, h: 100, score: 0.7 },
    ]);
    expect(decodePeople(data, 3, identity)).toHaveLength(2);
  });

  it("maps letterboxed coordinates back to the source frame", () => {
    // 1280x360 frame: scale 0.5, 230px of vertical padding on each side.
    const meta = { scale: 0.5, padX: 0, padY: 230, width: 1280, height: 360 };
    const data = output(1, [{ cx: 320, cy: 320, w: 100, h: 100, score: 0.9 }]);
    const [{ bbox }] = decodePeople(data, 1, meta);
    expect(bbox).toEqual([540, 80, 200, 200]);
  });
});
