import "./SourceSwitch.scss";

const options = [
  { id: "video", label: "Vídeo" },
  { id: "webcam", label: "Webcam" },
];

export default function SourceSwitch({ mode, onChange, disabled }) {
  return (
    <div className="source-switch" role="group" aria-label="Fonte da imagem">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`source-switch__option${mode === id ? " source-switch__option--active" : ""}`}
          aria-pressed={mode === id}
          disabled={disabled}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
