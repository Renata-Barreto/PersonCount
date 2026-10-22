import "./DetectionSettings.scss";

export default function DetectionSettings({ settings, onChange, disabled }) {
  const percent = Math.round(settings.minScore * 100);
  return (
    <section className="detection-settings" aria-labelledby="settings-title">
      <h2 id="settings-title">Ajustes</h2>
      <label className="detection-settings__field">
        <span>
          Confiança mínima <strong>{percent}%</strong>
        </span>
        <input
          type="range"
          min="10"
          max="90"
          step="5"
          value={percent}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...settings,
              minScore: Number(event.target.value) / 100,
            })
          }
        />
        <small>Valores altos descartam detecções incertas.</small>
      </label>
      <label className="detection-settings__field">
        <span>Limiar de alerta</span>
        <input
          type="number"
          min="1"
          max="999"
          step="1"
          value={settings.alertThreshold}
          disabled={disabled}
          onChange={(event) => {
            const value = Math.trunc(Number(event.target.value));
            if (value >= 1)
              onChange({ ...settings, alertThreshold: Math.min(value, 999) });
          }}
        />
        <small>Amostras com esta contagem ou mais entram em alerts.json.</small>
      </label>
    </section>
  );
}
