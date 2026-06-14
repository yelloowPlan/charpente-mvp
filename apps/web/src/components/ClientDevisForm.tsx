import { useState } from "react";
import type { Client } from "@charpente/moteur";
import type { DocumentDevis } from "../lib/persistence.ts";

interface Props {
  doc: DocumentDevis;
  onChange: (d: DocumentDevis) => void;
}

export function ClientDevisForm({ doc, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false);

  const setClient = (cle: keyof Client, valeur: string) =>
    onChange({ ...doc, client: { ...doc.client, [cle]: valeur } });

  return (
    <fieldset className="form-entreprise">
      <legend>
        <button type="button" className="toggle-entreprise" onClick={() => setOuvert((o) => !o)}>
          Client &amp; devis {ouvert ? "▲" : "▼"}
        </button>
      </legend>
      {ouvert && (
        <div className="champs-entreprise">
          <label className="champ-large">
            <span>Client</span>
            <input value={doc.client.nom} onChange={(e) => setClient("nom", e.target.value)} />
          </label>
          <label className="champ-large">
            <span>Adresse client</span>
            <input value={doc.client.adresse} onChange={(e) => setClient("adresse", e.target.value)} />
          </label>
          <label className="champ-large">
            <span>Code postal</span>
            <input value={doc.client.codePostal} onChange={(e) => setClient("codePostal", e.target.value)} />
          </label>
          <label className="champ-large">
            <span>Ville</span>
            <input value={doc.client.ville} onChange={(e) => setClient("ville", e.target.value)} />
          </label>
          <label className="champ-large">
            <span>N° de devis</span>
            <input value={doc.numeroDevis} onChange={(e) => onChange({ ...doc, numeroDevis: e.target.value })} />
          </label>
          <label className="champ-large">
            <span>Validité (jours)</span>
            <input
              type="number"
              inputMode="numeric"
              value={doc.validiteJours}
              onChange={(e) => onChange({ ...doc, validiteJours: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
