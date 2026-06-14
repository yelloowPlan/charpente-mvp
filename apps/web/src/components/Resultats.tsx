import {
  type Etude,
  type Entreprise,
  coupeTransversaleSvg,
  etudeVersHtml,
  nomenclatureVersCsv,
  debitVersCsv,
  devisVersCsv,
} from "@charpente/moteur";
import { euros, nb } from "../lib/format.ts";
import { telecharger } from "../lib/telechargement.ts";

interface Props {
  etude: Etude;
  entreprise?: Entreprise;
  referenceChantier?: string;
}

export function Resultats({ etude, entreprise, referenceChantier }: Props) {
  const { projet: p, geometrie: g, nomenclature: nom, debit, devis } = etude;

  const svg = coupeTransversaleSvg({
    largeurM: p.batiment.largeurM,
    hauteurFaitageM: g.hauteurFaitageM,
    penteDeg: p.toiture.penteDeg,
    nbPannesIntermParPan: nom.nbPannesIntermediairesParPan,
    nbPans: g.nbPans,
  });

  const dateGeneration = new Date().toISOString().slice(0, 10);
  const htmlEtude = () =>
    etudeVersHtml(etude, { dateGeneration, entreprise, referenceChantier });

  return (
    <div className="resultats">
      <div className="export-bar">
        <button onClick={() => telecharger("etude-charpente.html", htmlEtude(), "text/html")}>
          ⬇ Étude HTML (imprimable)
        </button>
        <button onClick={() => telecharger("devis.csv", devisVersCsv(devis), "text/csv")}>⬇ Devis CSV</button>
        <button onClick={() => telecharger("debit.csv", debitVersCsv(debit), "text/csv")}>⬇ Débit CSV</button>
        <button onClick={() => telecharger("nomenclature.csv", nomenclatureVersCsv(nom), "text/csv")}>⬇ Nomenclature CSV</button>
      </div>

      <div className="bloc">
        <h2>Géométrie</h2>
        <div className="cartes">
          <Carte titre="Surface toiture" valeur={`${nb(g.surfaceToitureM2)} m²`} />
          <Carte titre="Rampant" valeur={`${nb(g.rampantM, 3)} m`} />
          <Carte titre="Hauteur faîtage" valeur={`${nb(g.hauteurFaitageM, 3)} m`} />
          <Carte titre="Portée chevron adm." valeur={`${nb(nom.porteeAdmissibleChevronM, 2)} m`} />
        </div>
        <div className="coupe" dangerouslySetInnerHTML={{ __html: svg }} />
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
            {devis.lignes.map((l, i) => (
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
          <div>
            Total HT : <b>{euros(devis.totalHtCents)}</b>
          </div>
          <div>
            TVA {devis.tauxTvaPct} % : <b>{euros(devis.tvaCents)}</b>
          </div>
          <div className="ttc">Total TTC : {euros(devis.totalTtcCents)}</div>
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
