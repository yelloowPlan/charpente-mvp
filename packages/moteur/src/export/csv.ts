import type { Element } from "../domain/types.ts";
import type { PlanDebit } from "../engine/debit.ts";
import type { Devis } from "../engine/devis.ts";
import type { ResultatNomenclature } from "../engine/nomenclature.ts";

/**
 * Export CSV (séparateur `;`, décimales à la virgule, BOM UTF-8) — ouverture
 * directe dans Excel/LibreOffice en locale française, accents préservés.
 * Chaînes pures, aucune dépendance.
 */

const BOM = "﻿";
const SEP = ";";

/** Montant (centimes) → « 1234,56 » (sans séparateur de milliers, robuste en CSV). */
function montant(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Quantité → chaîne à la virgule (entier laissé tel quel par String). */
function qte(n: number): string {
  return String(n).replace(".", ",");
}

/** Échappement CSV : guillemets si le champ contient `;`, `"` ou un saut de ligne. */
function champ(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function versCsv(entete: string[], lignes: string[][]): string {
  const toutes = [entete, ...lignes];
  return BOM + toutes.map((l) => l.map(champ).join(SEP)).join("\r\n") + "\r\n";
}

export function nomenclatureVersCsv(nom: ResultatNomenclature): string {
  const lignes = nom.elements.map((e: Element) => [
    e.role,
    e.nom,
    qte(e.quantite),
    e.longueurM.toFixed(3).replace(".", ","),
    `${e.section.largeurMm}x${e.section.hauteurMm}`,
    e.modeDebit,
    e.formule,
  ]);
  return versCsv(
    ["Rôle", "Désignation", "Quantité", "Longueur (m)", "Section (mm)", "Mode", "Formule"],
    lignes,
  );
}

export function debitVersCsv(plan: PlanDebit): string {
  const lignes = plan.sections.map((s) => [
    s.sectionLabel,
    s.mode,
    String(s.barres),
    s.mlBrut.toFixed(2).replace(".", ","),
    s.mlAchete.toFixed(2).replace(".", ","),
    s.pertePct.toFixed(1).replace(".", ","),
    s.volumeAcheteM3.toFixed(3).replace(".", ","),
  ]);
  return versCsv(
    ["Section (mm)", "Mode", "Barres", "Métré brut (m)", "Métré acheté (m)", "Perte (%)", "Volume (m³)"],
    lignes,
  );
}

/**
 * Plan de coupe atelier : pour chaque barre, les pièces à débiter et la chute.
 * Prépare la fabrication (quelle barre → quelles longueurs).
 */
export function planDeCoupeVersCsv(plan: PlanDebit): string {
  const lignes: string[][] = [];
  for (const s of plan.sections) {
    if (s.mode === "barre" && s.detailBarres.length > 0) {
      s.detailBarres.forEach((b, i) => {
        lignes.push([
          s.sectionLabel,
          String(i + 1),
          b.longueurM.toFixed(2).replace(".", ","),
          b.pieces.map((p) => p.toFixed(2).replace(".", ",")).join(" + "),
          b.chuteM.toFixed(2).replace(".", ","),
        ]);
      });
    } else {
      // linéaire (aboutage) : résumé
      lignes.push([
        s.sectionLabel,
        "linéaire",
        s.mlAchete.toFixed(2).replace(".", ","),
        `${s.barres} barre(s) aboutées · ${s.mlBrut.toFixed(2).replace(".", ",")} m utiles`,
        (s.mlAchete - s.mlBrut).toFixed(2).replace(".", ","),
      ]);
    }
  }
  return versCsv(["Section (mm)", "Barre", "Longueur (m)", "Pièces (m)", "Chute (m)"], lignes);
}

export function devisVersCsv(devis: Devis): string {
  const lignes: string[][] = devis.lignes.map((l) => [
    l.libelle,
    qte(l.quantite),
    l.unite,
    montant(l.prixUnitaireCents),
    montant(l.totalHtCents),
  ]);
  // Totaux (lignes de pied)
  lignes.push(["", "", "", "", ""]);
  lignes.push(["Total HT", "", "", "", montant(devis.totalHtCents)]);
  lignes.push([`TVA ${devis.tauxTvaPct} %`, "", "", "", montant(devis.tvaCents)]);
  lignes.push(["Total TTC", "", "", "", montant(devis.totalTtcCents)]);
  return versCsv(["Désignation", "Quantité", "Unité", "PU (€ HT)", "Total (€ HT)"], lignes);
}
