import "./DetectionView.scss";

export default function DetectionView({ canvasRef, status }) {
  const hasFrames = ["processing", "saving", "complete"].includes(status);
  return (
    <section className="detection-view" aria-labelledby="detection-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 · DETECÇÃO</p>
          <h2 id="detection-title">Pessoas em cena</h2>
        </div>
        <span className="section-heading__note">
          Processamento no navegador
        </span>
      </div>
      <div className="detection-view__stage">
        <canvas
          ref={canvasRef}
          hidden={!hasFrames}
          aria-label="Quadros do vídeo com caixas vermelhas e confiança das pessoas detectadas"
        />
        {!hasFrames && (
          <div className="detection-view__empty">
            <span className="detection-view__frame" aria-hidden="true">
              ▶
            </span>
            <h3>
              {status === "preparing"
                ? "Preparando seu vídeo"
                : "Seu vídeo aparece aqui"}
            </h3>
            <p>As pessoas detectadas serão destacadas durante a análise.</p>
          </div>
        )}
      </div>
      <p className="detection-view__caption">
        <span aria-hidden="true" />
        Caixas vermelhas indicam pessoas detectadas. O rótulo mostra a confiança
        do modelo.
      </p>
    </section>
  );
}
