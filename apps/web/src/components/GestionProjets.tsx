import type { ProjetEnregistre } from "../lib/persistence.ts";

interface Props {
  projets: ProjetEnregistre[];
  nom: string;
  onNom: (v: string) => void;
  onSave: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export function GestionProjets({ projets, nom, onNom, onSave, onLoad, onDelete }: Props) {
  return (
    <fieldset className="form-projets">
      <legend>Projets</legend>

      <div className="ligne-save">
        <input
          type="text"
          placeholder="Nom du chantier"
          value={nom}
          onChange={(e) => onNom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
        />
        <button type="button" onClick={onSave}>
          Enregistrer
        </button>
      </div>

      {projets.length > 0 && (
        <ul className="liste-projets">
          {projets.map((p) => (
            <li key={p.id}>
              <button type="button" className="charger" title="Charger ce projet" onClick={() => onLoad(p.id)}>
                {p.nom}
              </button>
              <button
                type="button"
                className="suppr"
                aria-label={`Supprimer ${p.nom}`}
                title="Supprimer"
                onClick={() => onDelete(p.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
