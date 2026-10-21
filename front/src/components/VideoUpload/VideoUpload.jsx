import "./VideoUpload.scss";

export default function VideoUpload({
  file,
  onSelect,
  onProcess,
  isBusy,
  modelReady = true,
  canProcess,
}) {
  const pickerDisabled = isBusy || !modelReady;
  return (
    <section className="video-upload" aria-labelledby="upload-title">
      <p className="eyebrow">01 · SELECIONE O ARQUIVO</p>
      <h2 id="upload-title">Seu vídeo</h2>
      <p>Escolha um arquivo de vídeo salvo no seu dispositivo.</p>
      <label
        className={`video-upload__picker${pickerDisabled ? " video-upload__picker--disabled" : ""}`}
      >
        <span aria-hidden="true" className="video-upload__symbol">
          ↑
        </span>
        <span>Selecionar vídeo</span>
        <span className="video-upload__hint">Arquivo local · vídeo</span>
        <input
          type="file"
          accept="video/*"
          aria-label="Selecionar vídeo"
          disabled={pickerDisabled}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onSelect(selected);
            event.target.value = "";
          }}
        />
      </label>
      <p className="video-upload__filename">
        {file ? file.name : "Nenhum vídeo selecionado"}
      </p>
      <button
        className="button button--primary"
        type="button"
        onClick={onProcess}
        disabled={!canProcess}
      >
        {isBusy
          ? "Processando…"
          : modelReady
            ? "Processar vídeo"
            : "Carregando modelo…"}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
