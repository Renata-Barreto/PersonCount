import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVideoProcessing } from "./useVideoProcessing";
import { processVideo } from "../services/videoProcessor";

vi.mock("../services/videoProcessor", () => ({ processVideo: vi.fn() }));

describe("React processing lifecycle", () => {
  const file = new File(["video"], "people.mp4", { type: "video/mp4" });
  const history = [{ idFrame: 0, personCount: 2 }];

  it("prevents duplicate runs and resets results for another run in StrictMode", async () => {
    let finish;
    processVideo.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useVideoProcessing({}), {
      wrapper: StrictMode,
    });
    act(() => result.current.selectFile(file));
    let processing;
    act(() => {
      processing = result.current.process();
      result.current.process();
    });
    expect(processVideo).toHaveBeenCalledOnce();
    expect(result.current.isBusy).toBe(true);
    await act(async () => {
      finish(history);
      await processing;
    });
    expect(result.current.status).toBe("complete");
    expect(result.current.history).toEqual(history);
    act(() => result.current.selectFile(file));
    expect(result.current.history).toBeNull();
    expect(result.current.status).toBe("idle");
    processVideo.mockResolvedValue(history);
    await act(async () => {
      await result.current.process();
    });
    expect(processVideo).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("complete");
  });

  it("aborts the active run on unmount", async () => {
    let signal;
    processVideo.mockImplementation((options) => {
      signal = options.signal;
      return new Promise((resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      );
    });
    const { result, unmount } = renderHook(() => useVideoProcessing({}));
    act(() => result.current.selectFile(file));
    let processing;
    act(() => {
      processing = result.current.process();
    });
    unmount();
    await processing;
    expect(signal.aborted).toBe(true);
  });

  it("requires a model and a file, and reports decoding failures", async () => {
    const { result, rerender } = renderHook(
      ({ model }) => useVideoProcessing(model),
      { initialProps: { model: null } },
    );
    await act(async () => {
      await result.current.process();
    });
    act(() => result.current.selectFile(file));
    await act(async () => {
      await result.current.process();
    });
    expect(processVideo).not.toHaveBeenCalled();
    rerender({ model: {} });
    processVideo.mockRejectedValue(new Error("Invalid video"));
    await act(async () => {
      await result.current.process();
    });
    await waitFor(() => expect(result.current.error).toBe("Invalid video"));
    expect(result.current.isBusy).toBe(false);
  });
});
