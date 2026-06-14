import type { Etude } from "../engine/etude.ts";
import type { Entreprise } from "../domain/types.ts";
import { coupeTransversaleSvg } from "./schema-svg.ts";

/**
 * Livrable HTML autonome (CSS inline, imprimable A4 → PDF via le navigateur).
 * Chaîne pure, aucune dépendance. Le schéma de coupe SVG est embarqué.
 */

export interface OptionsHtml {
  /** date de génération (ISO ou libre) à afficher en pied — optionnel pour rester déterministe en test */
  dateGeneration?: string;
  /** en-tête entreprise (raison sociale, adresse, SIRET…) en haut du devis */
  entreprise?: Entreprise;
  /** nom du chantier, affiché à côté du titre */
  referenceChantier?: string;
}

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** En-tête entreprise (rendu seulement si au moins un champ est renseigné). */
function enteteEntreprise(e?: Entreprise): string {
  if (!e) return "";
  const champs = [e.raisonSociale, e.adresse, e.codePostal, e.ville, e.siret, e.telephone, e.email];
  if (champs.every((c) => !c || c.trim() === "")) return "";
  const villeLigne = [e.codePostal, e.ville].filter((x) => x && x.trim()).join(" ");
  const contact = [e.telephone, e.email].filter((x) => x && x.trim()).join(" · ");
  const lignes = [
    e.raisonSociale ? `<strong>${esc(e.raisonSociale)}</strong>` : "",
    e.adresse ? esc(e.adresse) : "",
    villeLigne ? esc(villeLigne) : "",
    e.siret ? `SIRET ${esc(e.siret)}` : "",
    contact ? esc(contact) : "",
  ].filter((l) => l !== "");
  return `<div class="entete-entreprise">${lignes.map((l) => `<div>${l}</div>`).join("")}</div>`;
}

const eur = (cents: number): string =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const nb = (n: number, dec = 2): string =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: dec });

export function etudeVersHtml(etude: Etude, options: OptionsHtml = {}): string {
  const { projet: p, geometrie: g, nomenclature: nom, debit, devis } = etude;

  const svg = coupeTransversaleSvg({
    largeurM: p.batiment.largeurM,
    hauteurFaitageM: g.hauteurFaitageM,
    penteDeg: p.toiture.penteDeg,
    nbPannesIntermParPan: nom.nbPannesIntermediairesParPan,
  });

  const lignesNomenclature = nom.elements
    .map(
      (e) => `<tr>
        <td>${esc(e.nom)}</td>
        <td class="num">${nb(e.quantite)}</td>
        <td class="num">${nb(e.longueurM, 3)} m</td>
        <td>${e.section.largeurMm}×${e.section.hauteurMm}</td>
        <td class="formule">${esc(e.formule)}</td>
      </tr>`,
    )
    .join("");

  const lignesDebit = debit.sections
    .map(
      (s) => `<tr>
        <td>${esc(s.sectionLabel)}</td>
        <td>${s.mode}</td>
        <td class="num">${s.barres}</td>
        <td class="num">${nb(s.mlBrut, 1)} m</td>
        <td class="num">${nb(s.mlAchete, 1)} m</td>
        <td class="num">${nb(s.pertePct, 1)} %</td>
        <td class="num">${nb(s.volumeAcheteM3, 3)} m³</td>
      </tr>`,
    )
    .join("");

  const lignesDevis = devis.lignes
    .map(
      (l) => `<tr>
        <td>${esc(l.libelle)}</td>
        <td class="num">${nb(l.quantite, 3)}</td>
        <td>${esc(l.unite)}</td>
        <td class="num">${eur(l.prixUnitaireCents)}</td>
        <td class="num">${eur(l.totalHtCents)}</td>
      </tr>`,
    )
    .join("");

  const alertes = etude.alertes
    .map((a) => {
      const tag = a.niveau === "attention" ? "⚠️" : a.niveau === "bloquant" ? "⛔" : "ℹ️";
      return `<li class="al-${a.niveau}">${tag} ${esc(a.message)}</li>`;
    })
    .join("");

  const pied = options.dateGeneration
    ? `<p class="pied">Généré le ${esc(options.dateGeneration)} — vérifications structurelles indicatives (flèche ELS), ne remplacent pas une note de calcul Eurocode 5.</p>`
    : `<p class="pied">Vérifications structurelles indicatives (flèche ELS), ne remplacent pas une note de calcul Eurocode 5.</p>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Étude de charpente</title>
<style>
  :root { --encre:#1f2937; --gris:#64748b; --trait:#e2e8f0; --accent:#b45309; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--encre);
         max-width: 920px; margin: 24px auto; padding: 0 20px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; border-bottom: 2px solid var(--trait); padding-bottom: 4px; }
  .meta { color: var(--gris); margin: 0 0 16px; font-size: 14px; }
  .haut { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
  .haut svg { width: 440px; max-width: 100%; border: 1px solid var(--trait); border-radius: 8px; }
  .geo { list-style: none; padding: 0; margin: 0; font-size: 14px; }
  .geo li { display: flex; justify-content: space-between; gap: 24px; padding: 3px 0; border-bottom: 1px dotted var(--trait); }
  .geo b { font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--trait); }
  th { color: var(--gris); font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.formule { color: var(--gris); font-size: 12px; }
  .totaux { margin-top: 8px; font-size: 14px; text-align: right; }
  .totaux .ttc { font-size: 17px; font-weight: 700; }
  ul.alertes { list-style: none; padding: 0; font-size: 13px; }
  ul.alertes li { padding: 4px 0; }
  .al-attention { color: #92400e; }
  .al-bloquant { color: #b91c1c; }
  .pied { margin-top: 28px; color: var(--gris); font-size: 12px; border-top: 1px solid var(--trait); padding-top: 10px; }
  .entete-entreprise { font-size: 13px; line-height: 1.4; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid var(--encre); }
  .entete-entreprise strong { font-size: 16px; }
  @media print { body { margin: 0; max-width: none; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  ${enteteEntreprise(options.entreprise)}
  <h1>Étude de charpente${options.referenceChantier ? ` — ${esc(options.referenceChantier)}` : ""}</h1>
  <p class="meta">Bâtiment ${nb(p.batiment.longueurM)} × ${nb(p.batiment.largeurM)} m ·
     pente ${p.toiture.penteDeg}° · couverture ${esc(p.toiture.couverture.type)} ·
     essence ${esc(p.essence.classe)}</p>

  <div class="haut">
    ${svg}
    <ul class="geo">
      <li><span>Rampant</span><b>${nb(g.rampantM, 3)} m</b></li>
      <li><span>Hauteur de faîtage</span><b>${nb(g.hauteurFaitageM, 3)} m</b></li>
      <li><span>Longueur de pan</span><b>${nb(g.longueurPanM, 3)} m</b></li>
      <li><span>Surface de toiture</span><b>${nb(g.surfaceToitureM2, 2)} m²</b></li>
      <li><span>Portée admissible chevron</span><b>${nb(nom.porteeAdmissibleChevronM, 2)} m</b></li>
    </ul>
  </div>

  <h2>Nomenclature</h2>
  <table>
    <thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">Longueur</th><th>Section</th><th>Détail</th></tr></thead>
    <tbody>${lignesNomenclature}</tbody>
  </table>

  <h2>Débit (optimisation des barres)</h2>
  <table>
    <thead><tr><th>Section</th><th>Mode</th><th class="num">Barres</th><th class="num">Brut</th><th class="num">Acheté</th><th class="num">Perte</th><th class="num">Volume</th></tr></thead>
    <tbody>${lignesDebit}</tbody>
  </table>

  <h2>Devis</h2>
  <table>
    <thead><tr><th>Désignation</th><th class="num">Qté</th><th>Unité</th><th class="num">PU HT</th><th class="num">Total HT</th></tr></thead>
    <tbody>${lignesDevis}</tbody>
  </table>
  <div class="totaux">
    <div>Total HT : <b>${eur(devis.totalHtCents)}</b></div>
    <div>TVA ${devis.tauxTvaPct} % : <b>${eur(devis.tvaCents)}</b></div>
    <div class="ttc">Total TTC : ${eur(devis.totalTtcCents)}</div>
  </div>

  <h2>Alertes &amp; vérifications</h2>
  <ul class="alertes">${alertes}</ul>

  ${pied}
</body>
</html>`;
}
