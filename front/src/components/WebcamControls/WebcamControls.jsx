import "./WebcamControls.scss";

export default function WebcamControls({
  status,
  count,
  isActive,
  modelReady,
  onStart,
  onStop,
}) {
  return (
    <section className="webcam-controls" aria-labelledby="webcam-title">
      <p className="eyebrow">01 · USE A CÂMERA</p>
      <h2 id="webcam-title">Webcam do notebook</h2>
      <p>
        Detecta pessoas em tempo real. O navegador vai pedir permissão para usar
        a câmera.
      </p>
      <p className="webcam-controls__count" aria-live="polite">
        <strong>{status === "running" && count !== null ? count : "–"}</strong>
        <span>{count === 1 ? "pessoa na imagem" : "pessoas na imagem"}</span>
      </p>
      <button
        className="button button--primary"
        type="button"
        onClick={isActive ? onStop : onStart}
        disabled={!isActive && !modelReady}
      >
        {isActive
          ? "Parar webcam"
          : modelReady
            ? "Ligar webcam"
            : "Carregando modelo…"}
        <span aria-hidden="true">{isActive ? "■" : "→"}</span>
      </button>
    </section>
  );
}
