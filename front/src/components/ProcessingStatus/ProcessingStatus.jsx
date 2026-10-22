import "./ProcessingStatus.scss";

const messages = {
  idle: "Selecione um vídeo e clique em Processar vídeo.",
  preparing: "Preparando o vídeo…",
  processing: "Detectando pessoas durante a reprodução…",
  saving: "Finalizando o envio das contagens…",
  complete: "Análise concluída. O gráfico está disponível abaixo.",
  error: "Não foi possível concluir a análise.",
};

export default function ProcessingStatus({
  modelStatus,
  modelProgress = 0,
  modelBackend,
  status,
  error,
  saveError,
}) {
  const percent = Math.round(modelProgress * 100);
  const modelMessages = {
    loading: `Carregando modelo… ${percent}%`,
    ready: `Modelo pronto${modelBackend ? ` (${modelBackend === "gpu" ? "GPU" : "CPU"})` : ""}`,
    error: "Falha ao carregar modelo",
  };
  return (
    <section className="processing-status" aria-labelledby="status-title">
      <h2 id="status-title">Status da análise</h2>
      <div role="status" aria-live="polite">
        <p
          className={`processing-status__model processing-status__model--${modelStatus}`}
        >
          <span aria-hidden="true" />
          {modelMessages[modelStatus]}
        </p>
        {modelStatus === "loading" && (
          <progress
            className="processing-status__progress"
            value={percent}
            max="100"
            aria-label="Progresso do carregamento do modelo"
          />
        )}
        <p>
          {modelStatus === "loading"
            ? "A primeira carga pode levar alguns instantes."
            : messages[status]}
        </p>
        {status === "complete" && !saveError && (
          <p>Contagens salvas no servidor.</p>
        )}
      </div>
      {modelStatus === "error" && (
        <p className="processing-status__error" role="alert">
          Verifique sua conexão e recarregue a página para carregar o modelo.
        </p>
      )}
      {error && (
        <p className="processing-status__error" role="alert">
          {error}
        </p>
      )}
      {saveError && (
        <p className="processing-status__error" role="alert">
          Não foi possível salvar todas as contagens. Verifique se o backend
          está rodando. A visualização permanece disponível.
        </p>
      )}
    </section>
  );
}
