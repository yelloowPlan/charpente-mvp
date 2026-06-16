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

/** Zones de neige françaises (EN 1991-1-3 / NA). */
export type ZoneNeige = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D" | "E";
const SK0_ZONE: Record<ZoneNeige, number> = {
  A1: 0.45,
  A2: 0.45,
  B1: 0.55,
  B2: 0.55,
  C1: 0.65,
  C2: 0.65,
  D: 0.9,
  E: 1.4,
};

/**
 * Charge de neige caractéristique au sol sk (kN/m²), EN 1991-1-3 / annexe
 * nationale française : valeur de base par zone + supplément d'altitude (piecewise).
 * INDICATIF — à confirmer par la carte officielle / un bureau d'études.
 */
/** Résistance caractéristique en flexion f_m,k (MPa) par classe de résistance. */
const FMK: Record<string, number> = { C18: 18, C24: 24, C30: 30 };

/**
 * Résistance de calcul en flexion f_m,d (MPa) = k_mod · f_m,k / γ_M.
 * Par défaut : k_mod 0,8 (moyen terme, classe de service 2), γ_M 1,3 (bois massif).
 * INDICATIF.
 */
export function fmdMPa(classe: string, kmod = 0.8, gammaM = 1.3): number {
  return (kmod * (FMK[classe] ?? 24)) / gammaM;
}

/**
 * Contrainte de flexion (MPa) d'une poutre sur appuis simples, charge répartie :
 * σ = M / W_él, M = q·entraxe·ℓ²/8, W_él = b·h²/6. INDICATIF (pas de cisaillement,
 * déversement ni assemblages).
 */
export function contrainteFlexionMPa(
  section: Section,
  entraxeM: number,
  porteeM: number,
  chargeKNm2: number,
): number {
  const w = chargeKNm2 * entraxeM; // N/mm
  const l = porteeM * 1000; // mm
  const M = (w * l * l) / 8; // N·mm
  const Wel = (section.largeurMm * section.hauteurMm * section.hauteurMm) / 6; // mm³
  return Wel > 0 ? M / Wel : Infinity;
}

export function chargeNeigeSolKNm2(zone: ZoneNeige, altitudeM: number): number {
  const sk0 = SK0_ZONE[zone] ?? 0.45;
  const A = Math.max(0, altitudeM);
  let sDelta = 0;
  if (A > 1000) sDelta = (A * 7) / 1000 - 4.8;
  else if (A > 500) sDelta = (A * 3.5) / 1000 - 1.3;
  else if (A > 200) sDelta = (A * 1.5) / 1000 - 0.3;
  return Math.round((sk0 + sDelta) * 100) / 100;
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
