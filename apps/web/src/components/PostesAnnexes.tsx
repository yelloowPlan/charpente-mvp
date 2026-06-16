import { useState } from "react";
import { ligneLibre } from "@charpente/moteur";
import type { DocumentDevis } from "../lib/persistence.ts";

interface Props {
  doc: DocumentDevis;
  onChange: (d: DocumentDevis) => void;
}

export function PostesAnnexes({ doc, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const lignes = doc.lignesLibres;

  const majLigne = (i: number, patch: Partial<{ libelle: string; quantite: number; unite: string; prixUnitaireCents: number }>) => {
    const courante = lignes[i];
    const fusion = { ...courante, ...patch };
    fusion.totalHtCents = Math.round(fusion.quantite * fusion.prixUnitaireCents);
    onChange({ ...doc, lignesLibres: lignes.map((x, j) => (j === i ? fusion : x)) });
  };
  const ajouter = () => onChange({ ...doc, lignesLibres: [...lignes, ligneLibre("", 1, "forfait", 0)] });
  const retirer = (i: number) => onChange({ ...doc, lignesLibres: lignes.filter((_, j) => j !== i) });

  return (
    <fieldset className="form-entreprise">
      <legend>
        <button type="button" className="toggle-entreprise" onClick={() => setOuvert((o) => !o)}>
          Postes annexes &amp; mentions {ouvert ? "▲" : "▼"}
        </button>
      </legend>
      {ouvert && (
        <div className="champs-entreprise">
          {lignes.map((l, i) => (
            <div key={i} className="ligne-libre">
              <input
                placeholder="Désignation (échafaudage, dépose…)"
                value={l.libelle}
                onChange={(e) => majLigne(i, { libelle: e.target.value })}
              />
              <input
                type="number"
                inputMode="decimal"
                title="Quantité"
                value={l.quantite}
                onChange={(e) => majLigne(i, { quantite: Number(e.target.value) || 0 })}
              />
              <input
                title="Unité"
                value={l.unite}
                onChange={(e) => majLigne(i, { unite: e.target.value })}
              />
              <input
                type="number"
                inputMode="decimal"
                title="Prix unitaire € HT"
                value={l.prixUnitaireCents / 100}
                onChange={(e) => majLigne(i, { prixUnitaireCents: Math.round((Number(e.target.value) || 0) * 100) })}
              />
              <button type="button" className="suppr" aria-label="Retirer ce poste" onClick={() => retirer(i)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="ajouter-ligne" onClick={ajouter}>
            + Ajouter un poste
          </button>
          <label className="champ-large">
            <span>Conditions / mentions (CGV)</span>
            <textarea
              rows={3}
              value={doc.mentions}
              onChange={(e) => onChange({ ...doc, mentions: e.target.value })}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
