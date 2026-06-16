import { lazy, Suspense, useMemo, useState } from "react";
import {
  type Etude,
  type Entreprise,
  type Client,
  genererOssature3D,
  genererLattage3D,
  genererCouverture3D,
  planMasseSvg,
  appliquerRemise,
  etudeVersHtml,
  nomenclatureVersCsv,
  debitVersCsv,
  devisVersCsv,
  planDeCoupeVersCsv,
} from "@charpente/moteur";
import { euros, nb } from "../lib/format.ts";
import { telecharger } from "../lib/telechargement.ts";
import { telechargerDevisPdf } from "../lib/pdf.ts";

// Chargé à la demande : la stack 3D (three.js) reste hors du bundle initial.
const Vue3D = lazy(() => import("./Vue3D.tsx"));

const COUV_COULEUR: Record<string, string> = {
  tuile_mecanique: "#b25b3e",
  tuile_plate: "#8a3d2a",
  ardoise: "#3f4651",
  bac_acier: "#9aa3ab",
};

const ETAPES = ["Ossature", "Lattage", "Couverture"];

interface Props {
  etude: Etude;
  entreprise?: Entreprise;
  referenceChantier?: string;
  client?: Client;
  numeroDevis?: string;
  validiteJours?: number;
  remisePct?: number;
  acomptePct?: number;
  lignesLibres?: import("@charpente/moteur").LigneDevis[];
  mentions?: string;
}

export function Resultats({
  etude,
  entreprise,
  referenceChantier,
  client,
  numeroDevis,
  validiteJours,
  remisePct = 0,
  acomptePct = 0,
  lignesLibres = [],
  mentions = "",
}: Props) {
  const { projet: p, geometrie: g, nomenclature: nom, debit, devis } = etude;
  const df = appliquerRemise(devis, remisePct, acomptePct, lignesLibres);

  const poutres = useMemo(
    () => genererOssature3D(p, g, nom.nbPannesIntermediairesParPan),
    [p, g, nom.nbPannesIntermediairesParPan],
  );
  const lattage = useMemo(() => genererLattage3D(p, g), [p, g]);
  const pans = useMemo(() => genererCouverture3D(p, g), [p, g]);
  const couvertureCouleur = COUV_COULEUR[p.toiture.couverture.type] ?? "#b25b3e";
  const planSvg = useMemo(() => planMasseSvg(p, g), [p, g]);
  const [etape, setEtape] = useState(1);

  const dateGeneration = new Date().toISOString().slice(0, 10);
  const dateDevis = new Date().toLocaleDateString("fr-FR");
  const htmlEtude = () =>
    etudeVersHtml(etude, {
      dateGeneration,
      entreprise,
      referenceChantier,
      client,
      numeroDevis,
      dateDevis,
      validiteJours,
      remisePct,
      acomptePct,
      lignesLibres,
      mentions,
    });

  // Nom de fichier lisible : n° de devis ou nom du chantier, sinon « charpente ».
  const slug =
    (numeroDevis?.trim() || referenceChantier?.trim() || "charpente")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "charpente";

  const exporterPdf = () => {
    void telechargerDevisPdf(
      etude,
      { entreprise, client, numeroDevis, dateDevis, validiteJours, remisePct, acomptePct, referenceChantier, lignesLibres, mentions },
      `devis-${slug}.pdf`,
    ).catch((err) => console.error("Échec génération PDF", err));
  };

  return (
    <div className="resultats">
      <div className="export-bar">
        <button onClick={exporterPdf}>⬇ Devis PDF</button>
        <button onClick={() => telecharger(`devis-${slug}.html`, htmlEtude(), "text/html")}>
          ⬇ Étude HTML (imprimable)
        </button>
        <button onClick={() => telecharger("devis.csv", devisVersCsv(devis), "text/csv")}>⬇ Devis CSV</button>
        <button onClick={() => telecharger("debit.csv", debitVersCsv(debit), "text/csv")}>⬇ Débit CSV</button>
        <button onClick={() => telecharger("nomenclature.csv", nomenclatureVersCsv(nom), "text/csv")}>⬇ Nomenclature CSV</button>
        <button onClick={() => telecharger("plan-de-coupe.csv", planDeCoupeVersCsv(debit), "text/csv")}>⬇ Plan de coupe</button>
      </div>

      <div className="bloc">
        <h2>Géométrie</h2>
        <div className="cartes">
          <Carte titre="Surface toiture" valeur={`${nb(g.surfaceToitureM2)} m²`} />
          <Carte titre="Rampant" valeur={`${nb(g.rampantM, 3)} m`} />
          <Carte titre="Hauteur faîtage" valeur={`${nb(g.hauteurFaitageM, 3)} m`} />
          <Carte titre="Portée chevron adm." valeur={`${nb(nom.porteeAdmissibleChevronM, 2)} m`} />
        </div>
        <div className="etapes" role="tablist" aria-label="Étapes de construction">
          {ETAPES.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={etape === i + 1}
              className={etape === i + 1 ? "actif" : ""}
              onClick={() => setEtape(i + 1)}
            >
              <span className="etape-num">{i + 1}</span> {label}
            </button>
          ))}
        </div>
        <div className="vue3d">
          <Suspense fallback={<div className="vue3d-fallback">Chargement de la vue 3D…</div>}>
            <Vue3D
              poutres={poutres}
              lattage={lattage}
              pans={pans}
              couvertureCouleur={couvertureCouleur}
              etape={etape}
              largeurM={p.batiment.largeurM}
              hauteurM={g.hauteurFaitageM}
              longueurM={p.batiment.longueurM}
            />
          </Suspense>
        </div>
        <p className="vue3d-aide">Glissez pour pivoter · molette pour zoomer</p>
      </div>

      <div className="bloc">
        <h2>Plan de charpente</h2>
        <div className="plan" dangerouslySetInnerHTML={{ __html: planSvg }} />
      </div>

      <div className="bloc">
        <h2>Nomenclature</h2>
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="num">Qté</th>
              <th className="num">Longueur</th>
              <th>Section</th>
            </tr>
          </thead>
          <tbody>
            {nom.elements.map((e, i) => (
              <tr key={i}>
                <td>{e.nom}</td>
                <td className="num">{nb(e.quantite)}</td>
                <td className="num">{nb(e.longueurM, 3)} m</td>
                <td>
                  {e.section.largeurMm}×{e.section.hauteurMm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bloc">
        <h2>Débit</h2>
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Mode</th>
              <th className="num">Barres</th>
              <th className="num">Acheté</th>
              <th className="num">Perte</th>
              <th className="num">Volume</th>
            </tr>
          </thead>
          <tbody>
            {debit.sections.map((s, i) => (
              <tr key={i}>
                <td>{s.sectionLabel}</td>
                <td>{s.mode}</td>
                <td className="num">{s.barres}</td>
                <td className="num">{nb(s.mlAchete, 1)} m</td>
                <td className="num">{nb(s.pertePct, 1)} %</td>
                <td className="num">{nb(s.volumeAcheteM3, 3)} m³</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bloc">
        <h2>Devis</h2>
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="num">Qté</th>
              <th>Unité</th>
              <th className="num">PU HT</th>
              <th className="num">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {df.lignes.map((l, i) => (
              <tr key={i}>
                <td>{l.libelle}</td>
                <td className="num">{nb(l.quantite, 3)}</td>
                <td>{l.unite}</td>
                <td className="num">{euros(l.prixUnitaireCents)}</td>
                <td className="num">{euros(l.totalHtCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totaux">
          {df.remiseCents > 0 && (
            <>
              <div>
                Sous-total HT : <b>{euros(df.sousTotalHtCents)}</b>
              </div>
              <div>
                Remise {df.remisePct} % : <b>− {euros(df.remiseCents)}</b>
              </div>
            </>
          )}
          <div>
            Total HT : <b>{euros(df.totalHtCents)}</b>
          </div>
          <div>
            TVA {df.tauxTvaPct} % : <b>{euros(df.tvaCents)}</b>
          </div>
          <div className="ttc">Total TTC : {euros(df.totalTtcCents)}</div>
          {df.acompteCents > 0 && (
            <div>
              Acompte {df.acomptePct} % : <b>{euros(df.acompteCents)}</b>
            </div>
          )}
        </div>
      </div>

      {etude.alertes.length > 0 && (
        <div className="bloc">
          <h2>Alertes &amp; vérifications</h2>
          <ul className="alertes">
            {etude.alertes.map((a, i) => (
              <li key={i} className={`al-${a.niveau}`}>
                {a.niveau === "attention" ? "⚠️" : a.niveau === "bloquant" ? "⛔" : "ℹ️"} {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Carte(props: { titre: string; valeur: string }) {
  return (
    <div className="carte">
      <span className="carte-titre">{props.titre}</span>
      <span className="carte-valeur">{props.valeur}</span>
    </div>
  );
}
