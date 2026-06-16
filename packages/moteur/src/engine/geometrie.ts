import type { ParametresProjet } from "../domain/types.ts";

/**
 * Géométrie d'une toiture : deux pans, appentis (mono-pan) ou croupe (4 pans).
 * Toutes les longueurs sont en mètres.
 */
export interface GeometrieToit {
  /** nombre de pans (2 = deux pans, 1 = appentis, 4 = croupe) */
  nbPans: number;
  /** longueur réelle d'un rampant principal, débord compris (m) */
  rampantM: number;
  /** longueur réelle d'un rampant principal, hors débord (m) */
  rampantSansDebordM: number;
  /** hauteur du faîtage / mur haut, au-dessus des sablières (m) */
  hauteurFaitageM: number;
  /** longueur d'un pan principal (m) — sert aux sablières/pannes longitudinales */
  longueurPanM: number;
  /** projection horizontale d'un rampant principal hors débord (m) */
  demiPorteeM: number;
  /** surface développée de la toiture (m²) */
  surfaceToitureM2: number;
  /** longueur de la panne faîtière (m) — raccourcie en croupe (L − W) */
  longueurFaitageM: number;
  /** longueur réelle d'un arêtier (m) — 0 hors croupe */
  longueurAretierM: number;
}

const degVersRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Géométrie selon la typologie (α = pente) :
 *  - deux pans : rampant=(W/2+d)/cosα, h=(W/2)tanα, surface=2·rampant·Lp
 *  - appentis  : rampant=(W+d)/cosα,  h=W·tanα,     surface=rampant·Lp
 *  - croupe    : surface=(L+2d)(W+2d)/cosα ; faîtage=max(0,L−W) ;
 *                arêtier=(W/2)·√(2+tan²α) (hip à pente égale)
 */
export function calculerGeometrie(p: ParametresProjet): GeometrieToit {
  const { largeurM: W, longueurM: L, debordRampantM: d, debordPignonM: dp } = p.batiment;
  const alpha = degVersRad(p.toiture.penteDeg);
  const cos = Math.cos(alpha);
  const tan = Math.tan(alpha);
  const typologie = p.toiture.typologie;

  if (typologie === "appentis") {
    const demiPorteeM = W;
    const rampantM = (demiPorteeM + d) / cos;
    const longueurPanM = L + 2 * dp;
    return {
      nbPans: 1,
      rampantM,
      rampantSansDebordM: demiPorteeM / cos,
      hauteurFaitageM: demiPorteeM * tan,
      longueurPanM,
      demiPorteeM,
      surfaceToitureM2: rampantM * longueurPanM,
      longueurFaitageM: longueurPanM,
      longueurAretierM: 0,
    };
  }

  if (typologie === "croupe") {
    const demiPorteeM = W / 2;
    const longueurPanM = L + 2 * d; // débord d'avant-toit sur les longs pans
    return {
      nbPans: 4,
      rampantM: (demiPorteeM + d) / cos,
      rampantSansDebordM: demiPorteeM / cos,
      hauteurFaitageM: demiPorteeM * tan,
      longueurPanM,
      demiPorteeM,
      surfaceToitureM2: ((L + 2 * d) * (W + 2 * d)) / cos,
      longueurFaitageM: Math.max(0, L - W),
      longueurAretierM: demiPorteeM * Math.sqrt(2 + tan * tan),
    };
  }

  // deux pans (par défaut)
  const demiPorteeM = W / 2;
  const rampantM = (demiPorteeM + d) / cos;
  const longueurPanM = L + 2 * dp;
  return {
    nbPans: 2,
    rampantM,
    rampantSansDebordM: demiPorteeM / cos,
    hauteurFaitageM: demiPorteeM * tan,
    longueurPanM,
    demiPorteeM,
    surfaceToitureM2: 2 * rampantM * longueurPanM,
    longueurFaitageM: longueurPanM,
    longueurAretierM: 0,
  };
}
