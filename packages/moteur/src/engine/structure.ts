import type { ParametresProjet, Section } from "../domain/types.ts";

/**
 * Vérifications structurelles INDICATIVES.
 *
 * ⚠️ AVERTISSEMENT IMPORTANT (à afficher à l'utilisateur)
 * Ce module ne calcule QUE la flèche (état limite de service, ELS), pour une
 * poutre sur appuis simples sous charge uniformément répartie. Il NE remplace
 * PAS une note de calcul Eurocode 5 : aucune vérification ELU (contraintes de
 * flexion/cisaillement), ni flambement/déversement, ni assemblages, ni
 * combinaisons de charges complètes. À faire valider par un bureau d'études.
 */

/** Aire d'une section, en m². */
export function aireSectionM2(s: Section): number {
  return (s.largeurMm / 1000) * (s.hauteurMm / 1000);
}

/** Moment quadratique I (flexion sur l'axe fort), en mm⁴ : I = b·h³/12. */
export function momentQuadratiqueMm4(s: Section): number {
  return (s.largeurMm * Math.pow(s.hauteurMm, 3)) / 12;
}

/**
 * Charge surfacique ELS simplifiée (G + S), en kN/m².
 * G = poids propre de la couverture ; S = neige caractéristique.
 * (Le poids propre du bois est négligé ici — hypothèse conservatrice côté flèche
 * car la couverture domine ; documenté comme indicatif.)
 */
export function chargeElsKNm2(p: ParametresProjet): number {
  const poidsCouvertureKNm2 = (p.toiture.couverture.poidsKgM2 * 9.81) / 1000;
  return poidsCouvertureKNm2 + p.charges.neigeKNm2;
}

/**
 * Portée admissible (distance maximale entre appuis) d'une pièce fléchie,
 * limitée par la flèche ELS f ≤ portée / ratio.
 *
 * Poutre sur appuis simples, charge uniformément répartie w = q · entraxe.
 * Flèche : f = 5·w·ℓ⁴ / (384·E·I).
 * On résout f = ℓ/ratio  ⇒  ℓ³ = 384·E·I / (5·ratio·w).
 *
 * Astuce d'unités : q [kN/m²] · entraxe [m] = w [kN/m] = w [N/mm].
 * Avec ℓ en mm, I en mm⁴, E en N/mm² → f en mm. On reconvertit ℓ en m.
 *
 * @returns portée admissible en mètres (Infinity si charge nulle).
 */
export function porteeAdmissibleFlecheM(
  section: Section,
  entraxeM: number,
  chargeKNm2: number,
  moduleEMpa: number,
  ratioFleche = 300,
): number {
  const w = chargeKNm2 * entraxeM; // N/mm
  if (w <= 0) return Infinity;
  const I = momentQuadratiqueMm4(section); // mm⁴
  const l3 = (384 * moduleEMpa * I) / (5 * ratioFleche * w); // mm³
  return Math.cbrt(l3) / 1000; // m
}
