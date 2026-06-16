import {
  appliquerRemise,
  type Etude,
  type Entreprise,
  type Client,
  type LigneDevis,
} from "@charpente/moteur";

/**
 * Génère et télécharge un devis PDF soigné. jsPDF est importé dynamiquement :
 * il ne pèse pas sur le bundle initial (chargé au premier clic).
 */

export interface OptionsPdf {
  entreprise?: Entreprise;
  client?: Client;
  numeroDevis?: string;
  dateDevis?: string;
  validiteJours?: number;
  remisePct?: number;
  acomptePct?: number;
  referenceChantier?: string;
  lignesLibres?: LigneDevis[];
  mentions?: string;
  coeffVente?: number;
}

const eur = (c: number): string =>
  (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const nb = (n: number, d = 2): string =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: d });

const ACCENT: [number, number, number] = [180, 83, 9]; // bronze
const ENCRE: [number, number, number] = [28, 25, 23];
const GRIS: [number, number, number] = [120, 113, 108];

export async function telechargerDevisPdf(
  etude: Etude,
  o: OptionsPdf,
  nomFichier: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = M;

  // --- En-tête entreprise (gauche) ---
  const e = o.entreprise;
  doc.setTextColor(...ENCRE);
  if (e?.raisonSociale) {
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text(e.raisonSociale, M, y);
    y += 6;
  }
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...GRIS);
  const eLignes = [
    e?.adresse ?? "",
    [e?.codePostal, e?.ville].filter(Boolean).join(" "),
    e?.siret ? `SIRET ${e.siret}` : "",
    [e?.telephone, e?.email].filter(Boolean).join(" · "),
  ].filter((l) => l.trim() !== "");
  for (const l of eLignes) {
    doc.text(l, M, y);
    y += 4.5;
  }

  // --- Bloc devis (droite) ---
  let yr = M;
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...ACCENT);
  doc.text("DEVIS", W - M, yr, { align: "right" });
  yr += 7;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...GRIS);
  const meta = [
    o.numeroDevis ? `N° ${o.numeroDevis}` : "",
    o.dateDevis ? `Date : ${o.dateDevis}` : "",
    o.validiteJours ? `Validité : ${o.validiteJours} jours` : "",
  ].filter(Boolean);
  for (const l of meta) {
    doc.text(l, W - M, yr, { align: "right" });
    yr += 4.5;
  }

  y = Math.max(y, yr) + 6;

  // --- Client ---
  const c = o.client;
  if (c && [c.nom, c.adresse, c.codePostal, c.ville].some((x) => x && x.trim())) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...GRIS);
    doc.text("À L'ATTENTION DE", M, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...ENCRE);
    const cLignes = [c.nom, c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" ")].filter(
      (l) => l && l.trim(),
    );
    for (const l of cLignes) {
      doc.text(l, M, y);
      y += 4.8;
    }
    y += 2;
  }

  // --- Titre chantier ---
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...ENCRE);
  doc.text(
    `Charpente${o.referenceChantier ? ` — ${o.referenceChantier}` : ""}`,
    M,
    y,
  );
  y += 3;
  const g = etude.geometrie;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS);
  doc.text(
    `Surface ${nb(g.surfaceToitureM2)} m² · pente ${etude.projet.toiture.penteDeg}° · hauteur ${nb(g.hauteurFaitageM, 2)} m`,
    M,
    y + 3,
  );
  y += 8;

  // --- Tableau devis ---
  const df = appliquerRemise(etude.devis, o.remisePct, o.acomptePct, o.lignesLibres, o.coeffVente);
  autoTable(doc, {
    startY: y,
    head: [["Désignation", "Qté", "Unité", "PU HT", "Total HT"]],
    body: df.lignes.map((l) => [
      l.libelle,
      nb(l.quantite, 2),
      l.unite,
      eur(l.prixUnitaireCents),
      eur(l.totalHtCents),
    ]),
    styles: { fontSize: 9, cellPadding: 2.2, textColor: ENCRE },
    headStyles: { fillColor: ENCRE, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: M, right: M },
  });

  // @ts-expect-error lastAutoTable est ajouté par le plugin
  let yT: number = doc.lastAutoTable.finalY + 8;

  // --- Totaux (droite) ---
  const ligneTotal = (label: string, valeur: string, gras = false) => {
    doc.setFont("helvetica", gras ? "bold" : "normal").setFontSize(gras ? 12 : 10);
    doc.setTextColor(...(gras ? ACCENT : ENCRE));
    doc.text(label, W - M - 50, yT);
    doc.text(valeur, W - M, yT, { align: "right" });
    yT += gras ? 7 : 5.5;
  };
  if (df.remiseCents > 0) {
    ligneTotal("Sous-total HT", eur(df.sousTotalHtCents));
    ligneTotal(`Remise ${df.remisePct} %`, `− ${eur(df.remiseCents)}`);
  }
  ligneTotal("Total HT", eur(df.totalHtCents));
  ligneTotal(`TVA ${df.tauxTvaPct} %`, eur(df.tvaCents));
  ligneTotal("Total TTC", eur(df.totalTtcCents), true);
  if (df.acompteCents > 0) ligneTotal(`Acompte ${df.acomptePct} %`, eur(df.acompteCents));

  // --- Mentions / CGV ---
  const H = doc.internal.pageSize.getHeight();
  if (o.mentions && o.mentions.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...GRIS);
    doc.text(doc.splitTextToSize(o.mentions, W - 2 * M), M, Math.max(yT + 6, H - 30));
  }

  // --- Pied ---
  doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...GRIS);
  doc.text(
    "Estimation indicative — vérifications structurelles (flèche ELS) ne remplaçant pas une note de calcul Eurocode 5.",
    M,
    H - 12,
    { maxWidth: W - 2 * M },
  );

  doc.save(nomFichier);
}
