import type { Alerte, Element, Section } from "../domain/types.ts";
import { aireSectionM2 } from "./structure.ts";

/**
 * Moteur de débit (calepinage des barres).
 *
 * Deux modes :
 *  - "barre"    : pièces rigides → algorithme First-Fit-Decreasing (FFD) avec
 *                 longueurs commerciales multiples + trait de scie (kerf).
 *  - "lineaire" : aboutage admis → on minimise la perte sur le métrage total
 *                 en choisissant la meilleure longueur commerciale.
 */

export interface BarreDebitee {
  longueurM: number;
  pieces: number[];
  chuteM: number;
}

export interface PlanSection {
  sectionLabel: string;
  section: Section;
  mode: "barre" | "lineaire";
  /** nombre de barres commerciales à acheter */
  barres: number;
  /** métré net des pièces (m) */
  mlBrut: number;
  /** métré acheté, barres entières (m) */
  mlAchete: number;
  /** perte en % du métré acheté */
  pertePct: number;
  /** volume de bois acheté pour cette section (m³) */
  volumeAcheteM3: number;
  /** détail des barres (mode "barre" uniquement) */
  detailBarres: BarreDebitee[];
}

export interface PlanDebit {
  sections: PlanSection[];
  alertes: Alerte[];
}

const labelSection = (s: Section): string => `${s.largeurMm}×${s.hauteurMm}`;

function plusPetiteBarreSuffisante(longueur: number, barres: number[]): number | null {
  let best: number | null = null;
  for (const b of barres) {
    if (b >= longueur && (best === null || b < best)) best = b;
  }
  return best;
}

/** FFD pour pièces rigides. Retourne les barres + les pièces trop longues. */
function debiterBarres(
  longueurs: number[],
  barresCommerciales: number[],
  kerfM: number,
): { barres: BarreDebitee[]; horsStandard: number[] } {
  const maxBarre = Math.max(...barresCommerciales);
  const horsStandard: number[] = [];
  const aPlacer: number[] = [];
  for (const l of longueurs) {
    if (l > maxBarre) horsStandard.push(l);
    else aPlacer.push(l);
  }
  aPlacer.sort((a, b) => b - a); // décroissant

  const barres: BarreDebitee[] = [];
  const reste: number[] = []; // capacité restante (peut devenir < 0, sans incidence)

  for (const piece of aPlacer) {
    let placed = false;
    for (let i = 0; i < barres.length; i++) {
      if (reste[i] >= piece + kerfM) {
        barres[i].pieces.push(piece);
        reste[i] -= piece + kerfM;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const L = plusPetiteBarreSuffisante(piece, barresCommerciales);
      // L ne peut pas être null : piece ≤ maxBarre garanti ci-dessus.
      const longueur = L ?? maxBarre;
      barres.push({ longueurM: longueur, pieces: [piece], chuteM: 0 });
      reste.push(longueur - piece - kerfM);
    }
  }
  for (let i = 0; i < barres.length; i++) {
    barres[i].chuteM = Math.max(0, reste[i]);
  }
  return { barres, horsStandard };
}

/** Choisit la longueur commerciale minimisant la perte sur un métrage total. */
function debiterLineaire(
  mlTotal: number,
  barresCommerciales: number[],
): { longueurM: number; barres: number; mlAchete: number } {
  let best = { longueurM: 0, barres: 0, mlAchete: 0, perte: Infinity };
  for (const L of barresCommerciales) {
    const n = Math.ceil(mlTotal / L);
    const ml = n * L;
    const perte = ml - mlTotal;
    if (perte < best.perte) best = { longueurM: L, barres: n, mlAchete: ml, perte };
  }
  return { longueurM: best.longueurM, barres: best.barres, mlAchete: best.mlAchete };
}

export function planifierDebit(
  elements: Element[],
  barresCommerciales: number[],
  kerfMm: number,
): PlanDebit {
  const kerfM = kerfMm / 1000;
  const alertes: Alerte[] = [];

  // Regrouper les longueurs par (section + mode de débit).
  const groupes = new Map<
    string,
    { section: Section; mode: "barre" | "lineaire"; longueurs: number[] }
  >();
  for (const el of elements) {
    const key = `${labelSection(el.section)}|${el.modeDebit}`;
    const grp = groupes.get(key) ?? { section: el.section, mode: el.modeDebit, longueurs: [] };
    for (let i = 0; i < el.quantite; i++) grp.longueurs.push(el.longueurM);
    groupes.set(key, grp);
  }

  const sections: PlanSection[] = [];
  for (const grp of groupes.values()) {
    const mlBrut = grp.longueurs.reduce((s, l) => s + l, 0);
    const aire = aireSectionM2(grp.section);

    if (grp.mode === "barre") {
      const { barres, horsStandard } = debiterBarres(grp.longueurs, barresCommerciales, kerfM);
      let mlAchete = barres.reduce((s, b) => s + b.longueurM, 0);
      let nbBarres = barres.length;

      // Pièces trop longues : comptabilisées en linéaire (aboutage/commande spéciale)
      // pour ne pas sous-estimer le coût, + alerte explicite.
      if (horsStandard.length > 0) {
        const mlHS = horsStandard.reduce((s, l) => s + l, 0);
        const linHS = debiterLineaire(mlHS, barresCommerciales);
        mlAchete += linHS.mlAchete;
        nbBarres += linHS.barres;
        alertes.push({
          niveau: "attention",
          message:
            `Section ${labelSection(grp.section)} : ${horsStandard.length} pièce(s) de longueur ` +
            `> ${Math.max(...barresCommerciales)} m (longueur max de barre). ` +
            `Prévoir aboutage, raccord sur appui ou commande sur mesure (lamellé-collé).`,
        });
      }

      sections.push({
        sectionLabel: labelSection(grp.section),
        section: grp.section,
        mode: "barre",
        barres: nbBarres,
        mlBrut,
        mlAchete,
        pertePct: mlAchete > 0 ? ((mlAchete - mlBrut) / mlAchete) * 100 : 0,
        volumeAcheteM3: mlAchete * aire,
        detailBarres: barres,
      });
    } else {
      const lin = debiterLineaire(mlBrut, barresCommerciales);
      sections.push({
        sectionLabel: labelSection(grp.section),
        section: grp.section,
        mode: "lineaire",
        barres: lin.barres,
        mlBrut,
        mlAchete: lin.mlAchete,
        pertePct: lin.mlAchete > 0 ? ((lin.mlAchete - mlBrut) / lin.mlAchete) * 100 : 0,
        volumeAcheteM3: lin.mlAchete * aire,
        detailBarres: [],
      });
    }
  }

  return { sections, alertes };
}
