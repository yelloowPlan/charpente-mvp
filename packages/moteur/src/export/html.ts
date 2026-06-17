import type { Etude } from "../engine/etude.ts";
import type { Entreprise, Client } from "../domain/types.ts";
import { appliquerRemise, type LigneDevis } from "../engine/devis.ts";
import { coupeTransversaleSvg } from "./schema-svg.ts";
import { planMasseSvg } from "./plan-svg.ts";
import { metreCouverture } from "../engine/couverture.ts";

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
  /** client destinataire (bloc « À l'attention de ») */
  client?: Client;
  /** numéro de devis */
  numeroDevis?: string;
  /** date du devis (chaîne déjà formatée) */
  dateDevis?: string;
  /** durée de validité du devis, en jours */
  validiteJours?: number;
  /** remise commerciale (% du HT) */
  remisePct?: number;
  /** acompte demandé à la commande (% du TTC) */
  acomptePct?: number;
  /** lignes libres (postes annexes : échafaudage, dépose, zinguerie…) */
  lignesLibres?: LigneDevis[];
  /** conditions générales / mentions à imprimer en pied de devis */
  mentions?: string;
  /** coefficient de vente (marge) appliqué aux lignes calculées */
  coeffVente?: number;
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

/** Bloc client + métadonnées de devis (n°, date, validité), rendu si non vide. */
function blocDevis(o: OptionsHtml): string {
  const c = o.client;
  const aClient = !!c && [c.nom, c.adresse, c.codePostal, c.ville].some((x) => x && x.trim() !== "");
  const meta: string[] = [];
  if (o.numeroDevis && o.numeroDevis.trim()) meta.push(`<div><strong>Devis n° ${esc(o.numeroDevis)}</strong></div>`);
  if (o.dateDevis && o.dateDevis.trim()) meta.push(`<div>Date : ${esc(o.dateDevis)}</div>`);
  if (typeof o.validiteJours === "number" && o.validiteJours > 0)
    meta.push(`<div>Validité : ${o.validiteJours} jours</div>`);

  if (!aClient && meta.length === 0) return "";

  const villeClient = c ? [c.codePostal, c.ville].filter((x) => x && x.trim()).join(" ") : "";
  const clientHtml = aClient
    ? `<div class="bloc-client">
        <div class="petit-titre">À l'attention de</div>
        ${c!.nom ? `<div><strong>${esc(c!.nom)}</strong></div>` : ""}
        ${c!.adresse ? `<div>${esc(c!.adresse)}</div>` : ""}
        ${villeClient ? `<div>${esc(villeClient)}</div>` : ""}
      </div>`
    : "<div></div>";
  const metaHtml = `<div class="bloc-meta">${meta.join("")}</div>`;
  return `<div class="bloc-devis">${clientHtml}${metaHtml}</div>`;
}

const eur = (cents: number): string =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const nb = (n: number, dec = 2): string =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: dec });

export function etudeVersHtml(etude: Etude, options: OptionsHtml = {}): string {
  const { projet: p, geometrie: g, nomenclature: nom, debit, devis } = etude;
  const df = appliquerRemise(devis, options.remisePct, options.acomptePct, options.lignesLibres, options.coeffVente);

  const svg = coupeTransversaleSvg({
    largeurM: p.batiment.largeurM,
    hauteurFaitageM: g.hauteurFaitageM,
    penteDeg: p.toiture.penteDeg,
    nbPannesIntermParPan: nom.nbPannesIntermediairesParPan,
    nbPans: g.nbPans,
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

  const lignesDevis = df.lignes
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

  const mentionsHtml =
    options.mentions && options.mentions.trim()
      ? `<p class="mentions">${esc(options.mentions).replace(/\n/g, "<br>")}</p>`
      : "";
  const pied = options.dateGeneration
    ? `${mentionsHtml}<p class="pied">Généré le ${esc(options.dateGeneration)} — vérifications structurelles indicatives (flèche ELS + flexion ELU), ne remplacent pas une note de calcul Eurocode 5.</p>`
    : `${mentionsHtml}<p class="pied">Vérifications structurelles indicatives (flèche ELS), ne remplacent pas une note de calcul Eurocode 5.</p>`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Étude de charpente</title>
<style>
  :root { --encre:#1c1917; --gris:#78716c; --trait:#e7e5e4; --accent:#b45309; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--encre);
         max-width: 920px; margin: 24px auto; padding: 0 20px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; border-bottom: 2px solid var(--trait); padding-bottom: 4px; }
  .meta { color: var(--gris); margin: 0 0 16px; font-size: 14px; }
  .haut { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
  .haut svg { width: 440px; max-width: 100%; border: 1px solid var(--trait); border-radius: 8px; }
  .plan svg { width: 480px; max-width: 100%; border: 1px solid var(--trait); border-radius: 8px; }
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
  .mentions { margin-top: 24px; font-size: 11px; color: var(--gris); line-height: 1.5; white-space: pre-line; }
  .pied { margin-top: 16px; color: var(--gris); font-size: 12px; border-top: 1px solid var(--trait); padding-top: 10px; }
  .entete-entreprise { font-size: 13px; line-height: 1.4; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid var(--encre); }
  .entete-entreprise strong { font-size: 16px; }
  .bloc-devis { display: flex; justify-content: space-between; gap: 24px; font-size: 13px; margin: 0 0 16px; }
  .bloc-meta { text-align: right; white-space: nowrap; }
  .petit-titre { color: var(--gris); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
  @media print { body { margin: 0; max-width: none; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  ${enteteEntreprise(options.entreprise)}
  ${blocDevis(options)}
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

  <h2>Plan de charpente</h2>
  <div class="plan">${planMasseSvg(p)}</div>

  <h2>Métré couverture</h2>
  ${(() => {
    const m = metreCouverture(p, g);
    const lignes = [
      ["Surface", `${nb(m.surfaceM2)} m²`],
      ["Faîtage", `${nb(m.mlFaitage, 2)} ml`],
      ...(m.mlAretiers > 0 ? [["Arêtiers", `${nb(m.mlAretiers, 2)} ml`]] : []),
      ...(m.mlNoues > 0 ? [["Noues", `${nb(m.mlNoues, 2)} ml`]] : []),
      ["Égout", `${nb(m.mlEgout, 2)} ml`],
      ...(m.mlRives > 0 ? [["Rives", `${nb(m.mlRives, 2)} ml`]] : []),
      ...(m.nbTuiles > 0 ? [["Tuiles (estimé)", `~ ${nb(m.nbTuiles, 0)}`]] : []),
    ];
    return `<ul class="geo">${lignes.map((l) => `<li><span>${l[0]}</span><b>${l[1]}</b></li>`).join("")}</ul>`;
  })()}

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
    ${df.remiseCents > 0 ? `<div>Sous-total HT : <b>${eur(df.sousTotalHtCents)}</b></div>
    <div>Remise ${df.remisePct} % : <b>− ${eur(df.remiseCents)}</b></div>` : ""}
    <div>Total HT : <b>${eur(df.totalHtCents)}</b></div>
    <div>TVA ${df.tauxTvaPct} % : <b>${eur(df.tvaCents)}</b></div>
    <div class="ttc">Total TTC : ${eur(df.totalTtcCents)}</div>
    ${df.acompteCents > 0 ? `<div>Acompte ${df.acomptePct} % à la commande : <b>${eur(df.acompteCents)}</b></div>` : ""}
  </div>

  <h2>Note de calcul chevron <small style="font-weight:400;color:#78716c">(indicative)</small></h2>
  ${(() => {
    const vs = etude.verifStructure;
    const lignes: [string, string][] = [
      ["Portée entre appuis retenue", `${nb(vs.porteeAdmissibleM, 2)} m`],
      ["Critère de flèche", `ELS L/${vs.ratioFleche}`],
      ["Charge ELU (1,35 G + 1,5 S)", `${nb(vs.chargeEluKNm2, 3)} kN/m²`],
      ["Contrainte de flexion σ", `${nb(vs.contrainteFlexionMPa, 2)} MPa`],
      [`Résistance f<sub>m,d</sub> (${esc(vs.classe)}, k_mod 0,8)`, `${nb(vs.fmdMPa, 2)} MPa`],
      ["Taux de travail en flexion", `${vs.tauxFlexionPct} %`],
    ];
    return `<ul class="geo">${lignes
      .map((l) => `<li><span>${l[0]}</span><b>${l[1]}</b></li>`)
      .join("")}</ul>`;
  })()}

  <h2>Alertes &amp; vérifications</h2>
  <ul class="alertes">${alertes}</ul>

  ${pied}
</body>
</html>`;
}
