import type { Element, Lucarne, ParametresProjet, Section } from "../domain/types.ts";

/**
 * Lucarnes (RFC 0002) — petits ouvrages posés sur un pan.
 *
 * ⚠️ Géométrie ESTIMATIVE : surfaces, linéaires de noue et ossature approchés (pour
 * le métré et le devis), pas un tracé exact des coupes composées. Le pan principal
 * n'est PAS percé (la petite trémie est négligée) ⇒ léger sur-métré, du bon côté.
 *
 * Deux types :
 *  - deux_pans (à fronton) : petit toit à 2 versants, faîtage perpendiculaire à
 *    l'égout, 2 noues. Pente déduite de la hauteur de face et de la demi-largeur.
 *  - chien_assis : 1 seul versant rampant de la face jusqu'au pan, 2 noues latérales.
 */

export interface MetreLucarnes {
  /** nombre de lucarnes */
  nb: number;
  /** surface de couverture ajoutée par les toits de lucarnes (m²) */
  surfaceM2: number;
  /** linéaire total de noues des lucarnes (m) */
  mlNoues: number;
  /** ossature estimative (chevrons, faîtières, noues, linteaux) */
  elements: Element[];
}

const hypot3 = (a: number, b: number, c: number): number => Math.sqrt(a * a + b * b + c * c);

export function metreLucarnes(p: ParametresProjet): MetreLucarnes {
  const lucarnes = p.toiture.lucarnes ?? [];
  const entraxe = p.charpente.entraxeChevronM;
  const s = p.charpente.sections;
  const elements: Element[] = [];
  let surfaceM2 = 0;
  let mlNoues = 0;

  // Agrégation par type pour des lignes de nomenclature lisibles.
  const acc = {
    chevron: { q: 0, ml: 0, sec: s.chevron as Section },
    faitiere: { q: 0, ml: 0, sec: s.panne as Section },
    noue: { q: 0, ml: 0, sec: s.arbaletrier as Section },
    linteau: { q: 0, ml: 0, sec: s.panne as Section },
  };

  for (const luc of lucarnes) {
    const L = Math.max(0.1, luc.largeurM);
    const hF = Math.max(0.1, luc.hauteurFaceM);
    const av = Math.max(0.1, luc.avanceeM);

    if (luc.type === "deux_pans") {
      const demi = L / 2;
      const rampant = Math.hypot(demi, hF); // versant transversal (demi-largeur, hauteur)
      const noue = Math.hypot(av, rampant); // arête du versant contre le pan principal
      surfaceM2 += 2 * rampant * av;
      mlNoues += 2 * noue;
      const nbChev = 2 * (Math.floor(av / entraxe) + 1);
      acc.chevron.q += nbChev;
      acc.chevron.ml += nbChev * rampant;
      acc.faitiere.q += 1;
      acc.faitiere.ml += av;
      acc.noue.q += 2;
      acc.noue.ml += 2 * noue;
      acc.linteau.q += 1;
      acc.linteau.ml += L;
    } else {
      // chien-assis : 1 versant unique de la face (haute) jusqu'au pan
      const rampant = Math.hypot(av, hF);
      surfaceM2 += L * rampant;
      mlNoues += 2 * rampant;
      const nbChev = Math.floor(L / entraxe) + 1;
      acc.chevron.q += nbChev;
      acc.chevron.ml += nbChev * rampant;
      acc.faitiere.q += 1;
      acc.faitiere.ml += L;
      acc.noue.q += 2;
      acc.noue.ml += 2 * rampant;
      acc.linteau.q += 1;
      acc.linteau.ml += L;
    }
  }

  const pousser = (
    role: Element["role"],
    nom: string,
    a: { q: number; ml: number; sec: Section },
    formuleSuffixe: string,
  ) => {
    if (a.q <= 0) return;
    elements.push({
      role,
      nom,
      longueurM: a.ml / a.q,
      section: a.sec,
      quantite: a.q,
      modeDebit: "barre",
      formule: `${a.q} pièce(s) — ${formuleSuffixe} (lucarnes, estimé)`,
    });
  };

  pousser("chevron", "Chevron de lucarne", acc.chevron, "versants de lucarne");
  pousser("panne_faitiere", "Faîtière de lucarne", acc.faitiere, "faîtage/linteau haut");
  pousser("noue", "Chevron de noue (lucarne)", acc.noue, "noues de lucarne, section renforcée");
  pousser("panne_sabliere", "Linteau de lucarne", acc.linteau, "linteau de face");

  return {
    nb: lucarnes.length,
    surfaceM2,
    mlNoues,
    elements,
  };
}
