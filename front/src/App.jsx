import AppHeader from "./components/AppHeader/AppHeader";
import VideoUpload from "./components/VideoUpload/VideoUpload";
import ProcessingStatus from "./components/ProcessingStatus/ProcessingStatus";
import DetectionView from "./components/DetectionView/DetectionView";
import ResultsChart from "./components/ResultsChart/ResultsChart";
import { usePersonModel } from "./hooks/usePersonModel";
import { useVideoProcessing } from "./hooks/useVideoProcessing";
import "./App.scss";

export default function App() {
  const { model, status: modelStatus, progress: modelProgress } = usePersonModel();
  const {
    file,
    selectFile,
    process,
    canvasRef,
    history,
    status,
    error,
    saveError,
    isBusy,
  } = useVideoProcessing(model);

  return (
    <div className="app">
      <AppHeader />
      <main className="workspace" id="conteudo">
        <section className="workspace__intro" aria-labelledby="page-title">
          <p className="eyebrow">ANÁLISE DE VÍDEO</p>
          <h1 id="page-title">Cada pessoa conta.</h1>
          <p>
            Selecione um vídeo para detectar pessoas e acompanhar as contagens
            ao longo da reprodução.
          </p>
        </section>
        <div className="workspace__grid">
          <aside
            className="workspace__controls"
            aria-label="Controles da análise"
          >
            <VideoUpload
              file={file}
              onSelect={selectFile}
              onProcess={process}
              isBusy={isBusy}
              modelReady={modelStatus === "ready"}
              canProcess={Boolean(file && model && !isBusy)}
            />
            <ProcessingStatus
              modelStatus={modelStatus}
              modelProgress={modelProgress}
              status={status}
              error={error}
              saveError={saveError}
            />
            <p className="workspace__privacy">
              O vídeo fica no seu navegador. Apenas as contagens são enviadas ao
              servidor.
            </p>
          </aside>
          <div className="workspace__results">
            <DetectionView canvasRef={canvasRef} status={status} />
            <ResultsChart history={history} />
          </div>
        </div>
      </main>
      <footer className="app__footer">
        PersonCount <span>Detecção com TensorFlow.js e COCO-SSD</span>
      </footer>
    </div>
  );
}
