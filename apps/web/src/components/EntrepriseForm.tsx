import { useState } from "react";
import type { Entreprise } from "@charpente/moteur";

interface Props {
  entreprise: Entreprise;
  onChange: (e: Entreprise) => void;
}

const CHAMPS: { cle: keyof Entreprise; label: string; type?: string }[] = [
  { cle: "raisonSociale", label: "Raison sociale" },
  { cle: "adresse", label: "Adresse" },
  { cle: "codePostal", label: "Code postal" },
  { cle: "ville", label: "Ville" },
  { cle: "siret", label: "SIRET" },
  { cle: "telephone", label: "Téléphone", type: "tel" },
  { cle: "email", label: "E-mail", type: "email" },
];

export function EntrepriseForm({ entreprise, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false);

  const set = (cle: keyof Entreprise, valeur: string) =>
    onChange({ ...entreprise, [cle]: valeur });

  return (
    <fieldset className="form-entreprise">
      <legend>
        <button type="button" className="toggle-entreprise" onClick={() => setOuvert((o) => !o)}>
          Mon entreprise (en-tête de devis) {ouvert ? "▲" : "▼"}
        </button>
      </legend>
      {ouvert && (
        <div className="champs-entreprise">
          {CHAMPS.map(({ cle, label, type }) => (
            <label key={cle} className="champ-large">
              <span>{label}</span>
              <input
                type={type ?? "text"}
                value={entreprise[cle]}
                onChange={(e) => set(cle, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
