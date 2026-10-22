import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWebcamDetection } from "./useWebcamDetection";
import { processWebcam } from "../services/webcamProcessor";

vi.mock("../services/webcamProcessor", () => ({ processWebcam: vi.fn() }));

const refs = [{ current: {} }, { current: {} }];

describe("webcam lifecycle in React", () => {
  it("starts once, shows the live count and returns to idle on stop", async () => {
    let options;
    processWebcam.mockImplementation((o) => {
      options = o;
      return new Promise((resolve) =>
        o.signal.addEventListener("abort", resolve),
      );
    });
    const { result } = renderHook(() => useWebcamDetection({}, ...refs, 0.4), {
      wrapper: StrictMode,
    });
    act(() => {
      result.current.start();
      result.current.start();
    });
    expect(processWebcam).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("starting");
    act(() => options.onReady());
    act(() => options.onCount(3));
    expect(result.current.status).toBe("running");
    expect(result.current.count).toBe(3);
    expect(options.getMinScore()).toBe(0.4);
    act(() => result.current.stop());
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.count).toBeNull();
  });

  it("reports camera errors and does nothing without a model", async () => {
    const { result, rerender } = renderHook(
      ({ model }) => useWebcamDetection(model, ...refs, 0.4),
      { initialProps: { model: null } },
    );
    await act(async () => result.current.start());
    expect(processWebcam).not.toHaveBeenCalled();
    rerender({ model: {} });
    processWebcam.mockRejectedValue(new Error("Permissão da câmera negada."));
    await act(async () => result.current.start());
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Permissão da câmera negada.");
  });

  it("stops the camera on unmount", () => {
    let signal;
    processWebcam.mockImplementation((o) => {
      signal = o.signal;
      return new Promise(() => {});
    });
    const { result, unmount } = renderHook(() =>
      useWebcamDetection({}, ...refs, 0.4),
    );
    act(() => {
      result.current.start();
    });
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
