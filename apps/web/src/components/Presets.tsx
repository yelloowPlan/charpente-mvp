import { PRESETS, type Preset } from "../lib/presets.ts";

interface Props {
  onCharger: (preset: Preset) => void;
}

export function Presets({ onCharger }: Props) {
  return (
    <div className="presets">
      <span className="presets-label">Modèles</span>
      <div className="presets-chips">
        {PRESETS.map((pr) => (
          <button key={pr.id} type="button" className="preset-chip" onClick={() => onCharger(pr)}>
            {pr.nom}
          </button>
        ))}
      </div>
    </div>
  );
}
