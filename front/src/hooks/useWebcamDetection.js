import { useEffect, useRef, useState } from "react";
import { processWebcam } from "../services/webcamProcessor";

export function useWebcamDetection(model, canvasRef, overlayRef, minScore) {
  const activeRun = useRef(null);
  const minScoreRef = useRef(minScore);
  const [status, setStatus] = useState("idle");
  const [count, setCount] = useState(null);
  const [error, setError] = useState("");

  // The confidence slider takes effect immediately, without restarting.
  useEffect(() => {
    minScoreRef.current = minScore;
  }, [minScore]);

  useEffect(
    () => () => {
      activeRun.current?.abort();
      activeRun.current = null;
    },
    [],
  );

  async function start() {
    if (!model || activeRun.current) return;
    const controller = new AbortController();
    activeRun.current = controller;
    setStatus("starting");
    setCount(null);
    setError("");
    let failed = false;
    try {
      await processWebcam({
        model,
        canvas: canvasRef.current,
        overlay: overlayRef.current,
        signal: controller.signal,
        getMinScore: () => minScoreRef.current,
        onReady: () => setStatus("running"),
        onCount: setCount,
      });
    } catch (cause) {
      if (cause.name !== "AbortError") {
        failed = true;
        if (activeRun.current === controller)
          setError(cause.message || "Não foi possível usar a webcam.");
      }
    } finally {
      if (activeRun.current === controller) {
        activeRun.current = null;
        setStatus(failed ? "error" : "idle");
        setCount(null);
      }
    }
  }

  function stop() {
    activeRun.current?.abort();
  }

  return {
    status,
    count,
    error,
    start,
    stop,
    isActive: status === "starting" || status === "running",
  };
}
