import AppHeader from "./components/AppHeader/AppHeader";
import VideoUpload from "./components/VideoUpload/VideoUpload";
import DetectionSettings from "./components/DetectionSettings/DetectionSettings";
import ProcessingStatus from "./components/ProcessingStatus/ProcessingStatus";
import DetectionView from "./components/DetectionView/DetectionView";
import ResultsChart from "./components/ResultsChart/ResultsChart";
import SourceSwitch from "./components/SourceSwitch/SourceSwitch";
import WebcamControls from "./components/WebcamControls/WebcamControls";
import { useState } from "react";
import { usePersonModel } from "./hooks/usePersonModel";
import { useVideoProcessing } from "./hooks/useVideoProcessing";
import { useWebcamDetection } from "./hooks/useWebcamDetection";
import "./App.scss";

export default function App() {
  const {
    model,
    status: modelStatus,
    progress: modelProgress,
  } = usePersonModel();
  const {
    file,
    selectFile,
    process,
    canvasRef,
    overlayRef,
    history,
    settings,
    setSettings,
    runSettings,
    status,
    error,
    saveError,
    isBusy,
  } = useVideoProcessing(model);
  const [mode, setMode] = useState("video");
  const webcam = useWebcamDetection(
    model,
    canvasRef,
    overlayRef,
    settings.minScore,
  );
  const isWebcam = mode === "webcam";
  const switchLocked = isBusy || webcam.isActive;
  const viewStatus = !isWebcam
    ? status
    : ({ starting: "preparing", running: "processing" }[webcam.status] ??
      "idle");

  return (
    <div className="app">
      <AppHeader />
      <main className="workspace" id="conteudo">
        <section className="workspace__intro" aria-labelledby="page-title">
          <p className="eyebrow">ANÁLISE DE VÍDEO</p>
          <h1 id="page-title">Cada pessoa conta.</h1>
          <p>
            Selecione um vídeo para acompanhar as contagens ao longo da
            reprodução, ou use a webcam para detectar pessoas em tempo real.
          </p>
        </section>
        <div className="workspace__grid">
          <aside
            className="workspace__controls"
            aria-label="Controles da análise"
          >
            <SourceSwitch
              mode={mode}
              onChange={setMode}
              disabled={switchLocked}
            />
            {isWebcam ? (
              <WebcamControls
                status={webcam.status}
                count={webcam.count}
                isActive={webcam.isActive}
                modelReady={modelStatus === "ready"}
                onStart={webcam.start}
                onStop={webcam.stop}
              />
            ) : (
              <VideoUpload
                file={file}
                onSelect={selectFile}
                onProcess={process}
                isBusy={isBusy}
                modelReady={modelStatus === "ready"}
                canProcess={Boolean(file && model && !isBusy)}
              />
            )}
            <DetectionSettings
              settings={settings}
              onChange={setSettings}
              disabled={isWebcam ? false : isBusy}
              mode={mode}
            />
            <ProcessingStatus
              modelStatus={modelStatus}
              modelProgress={modelProgress}
              modelBackend={model?.backend}
              mode={mode}
              status={isWebcam ? webcam.status : status}
              error={isWebcam ? webcam.error : error}
              saveError={!isWebcam && saveError}
            />
            <p className="workspace__privacy">
              {isWebcam
                ? "A imagem da câmera fica no seu navegador e nada é enviado ou salvo."
                : "O vídeo fica no seu navegador. Apenas as contagens são enviadas ao servidor."}
            </p>
          </aside>
          <div className="workspace__results">
            <DetectionView
              canvasRef={canvasRef}
              overlayRef={overlayRef}
              status={viewStatus}
            />
            {!isWebcam && (
              <ResultsChart
                history={history}
                alertThreshold={runSettings.alertThreshold}
              />
            )}
          </div>
        </div>
      </main>
      <footer className="app__footer">
        PersonCount <span>Detecção com YOLOv8 e ONNX Runtime Web</span>
      </footer>
    </div>
  );
}
