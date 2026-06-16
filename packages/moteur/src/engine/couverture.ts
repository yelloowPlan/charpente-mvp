import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "./geometrie.ts";

/**
 * Métré de couverture : surfaces et linéaires (faîtage, arêtiers, égout, rives)
 * + estimation du nombre de tuiles par densité au m² selon le type de couverture.
 */

export interface MetreCouverture {
  surfaceM2: number;
  mlFaitage: number;
  mlAretiers: number;
  mlEgout: number;
  mlRives: number;
  /** estimation du nombre de tuiles/ardoises (0 pour le bac acier) */
  nbTuiles: number;
}

/** Densité indicative de tuiles/ardoises au m² selon le type. */
const DENSITE: Record<string, number> = {
  tuile_mecanique: 12,
  tuile_plate: 60,
  ardoise: 20,
  bac_acier: 0,
};

export function metreCouverture(p: ParametresProjet, geo?: GeometrieToit): MetreCouverture {
  const g = geo ?? calculerGeometrie(p);
  const Lp = g.longueurPanM;
  const W = p.batiment.largeurM;
  const d = p.batiment.debordRampantM;
  const typologie = p.toiture.typologie;

  const mlFaitage = g.longueurFaitageM;
  const mlAretiers = typologie === "croupe" ? 4 * g.longueurAretierM : 0;

  let mlEgout = 0;
  let mlRives = 0;
  if (typologie === "deux_pans") {
    mlEgout = 2 * Lp; // 2 sablières
    mlRives = 4 * g.rampantM; // 2 pignons × 2 rampants
  } else if (typologie === "appentis") {
    mlEgout = Lp; // 1 égout bas
    mlRives = 2 * g.rampantM; // 2 rives latérales
  } else {
    // croupe : égout sur tout le périmètre, pas de rives (croupes à la place)
    mlEgout = 2 * Lp + 2 * (W + 2 * d);
    mlRives = 0;
  }

  const densite = DENSITE[p.toiture.couverture.type] ?? 0;
  const nbTuiles = Math.round(g.surfaceToitureM2 * densite);

  return {
    surfaceM2: Math.round(g.surfaceToitureM2 * 100) / 100,
    mlFaitage: Math.round(mlFaitage * 100) / 100,
    mlAretiers: Math.round(mlAretiers * 100) / 100,
    mlEgout: Math.round(mlEgout * 100) / 100,
    mlRives: Math.round(mlRives * 100) / 100,
    nbTuiles,
  };
}
