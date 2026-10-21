import { useEffect, useRef, useState } from "react";
import { processVideo } from "../services/videoProcessor";

export function useVideoProcessing(model) {
  const canvasRef = useRef(null);
  const activeRun = useRef(null);
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  useEffect(
    () => () => {
      activeRun.current?.abort();
      activeRun.current = null;
    },
    [],
  );

  function selectFile(selected) {
    if (activeRun.current) return;
    if (selected.type && !selected.type.startsWith("video/")) {
      setError("Selecione um arquivo de vídeo válido.");
      return;
    }
    setFile(selected);
    setHistory(null);
    setError("");
    setSaveError(false);
    setStatus("idle");
  }

  async function process() {
    if (!file || !model || activeRun.current) return;
    const controller = new AbortController();
    activeRun.current = controller;
    setHistory(null);
    setError("");
    setSaveError(false);
    setStatus("preparing");
    try {
      const result = await processVideo({
        file,
        model,
        canvas: canvasRef.current,
        signal: controller.signal,
        onStatus: setStatus,
        onSaveError: () => setSaveError(true),
      });
      if (activeRun.current !== controller) return;
      setHistory(result);
      setStatus("complete");
    } catch (cause) {
      if (activeRun.current !== controller || controller.signal.aborted) return;
      setError(cause.message || "Não foi possível processar o vídeo.");
      setStatus("error");
    } finally {
      if (activeRun.current === controller) activeRun.current = null;
    }
  }
  return {
    file,
    selectFile,
    process,
    canvasRef,
    history,
    status,
    error,
    saveError,
    isBusy: ["preparing", "processing", "saving"].includes(status),
  };
}
