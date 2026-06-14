import type { ParametresProjet, Section } from "../domain/types.ts";
import type { GeometrieToit } from "./geometrie.ts";
import type { PlanDebit } from "./debit.ts";

/**
 * Moteur de devis. Tous les montants sont en centimes d'euro (entiers).
 *
 * Le coût matière s'appuie sur le DÉBIT (métré ACHETÉ, barres entières), pour
 * refléter ce que l'artisan paie réellement, chutes comprises.
 *
 * Hypothèse de répartition (cohérente avec le moteur) :
 *  - sections en mode "barre"    = bois de structure  → facturé au m³
 *  - sections en mode "lineaire" = liteaux/contre-liteaux → facturés au ml
 */

export interface LigneDevis {
  libelle: string;
  quantite: number;
  unite: string;
  prixUnitaireCents: number;
  totalHtCents: number;
}

export interface Devis {
  lignes: LigneDevis[];
  totalHtCents: number;
  tvaCents: number;
  totalTtcCents: number;
  tauxTvaPct: number;
}

const labelSection = (s: Section): string => `${s.largeurMm}×${s.hauteurMm}`;

function ligne(
  libelle: string,
  quantite: number,
  unite: string,
  prixUnitaireCents: number,
): LigneDevis {
  return {
    libelle,
    quantite,
    unite,
    prixUnitaireCents,
    totalHtCents: Math.round(quantite * prixUnitaireCents),
  };
}

export function chiffrerDevis(
  p: ParametresProjet,
  geo: GeometrieToit,
  debit: PlanDebit,
): Devis {
  const prix = p.prix;
  const lblLiteau = labelSection(p.charpente.sections.liteau);
  const lblContre = labelSection(p.charpente.sections.contreLiteau);

  let volumeStructureM3 = 0;
  let mlLiteau = 0;
  let mlContre = 0;
  for (const s of debit.sections) {
    if (s.mode === "barre") {
      volumeStructureM3 += s.volumeAcheteM3;
    } else if (s.sectionLabel === lblContre) {
      mlContre += s.mlAchete;
    } else {
      // toute autre section linéaire est assimilée aux liteaux
      // (les contre-liteaux sont captés ci-dessus si leur section diffère)
      mlLiteau += s.mlAchete;
    }
  }

  const surface = geo.surfaceToitureM2;
  const heuresMo = prix.heuresParM2 * surface;

  const lignes: LigneDevis[] = [];
  lignes.push(
    ligne(
      "Bois de structure (chevrons, pannes, fermes)",
      Math.round(volumeStructureM3 * 1000) / 1000,
      "m³",
      p.essence.prixM3Cents,
    ),
  );
  lignes.push(ligne("Liteaux", Math.round(mlLiteau * 100) / 100, "ml", prix.liteauMlCents));
  if (mlContre > 0) {
    lignes.push(
      ligne("Contre-liteaux", Math.round(mlContre * 100) / 100, "ml", prix.contreLiteauMlCents),
    );
  }
  lignes.push(
    ligne("Couverture (fourniture)", Math.round(surface * 100) / 100, "m²", prix.couvertureM2Cents),
  );
  lignes.push(
    ligne("Quincaillerie / fixations", Math.round(surface * 100) / 100, "m²", prix.quincaillerieM2Cents),
  );
  lignes.push(
    ligne("Main-d'œuvre", Math.round(heuresMo * 100) / 100, "h", prix.mainOeuvreHeureCents),
  );

  const totalHtCents = lignes.reduce((s, l) => s + l.totalHtCents, 0);
  const tvaCents = Math.round((totalHtCents * prix.tauxTvaPct) / 100);
  const totalTtcCents = totalHtCents + tvaCents;

  return { lignes, totalHtCents, tvaCents, totalTtcCents, tauxTvaPct: prix.tauxTvaPct };
}
