import type { Element, ParametresProjet, Section } from "../domain/types.ts";
import type { GeometrieToit } from "./geometrie.ts";
import type { PlanDebit } from "./debit.ts";
import { aireSectionM2 } from "./structure.ts";

/**
 * Moteur de devis. Tous les montants sont en centimes d'euro (entiers).
 *
 * Le coût matière s'appuie sur le DÉBIT (métré ACHETÉ, barres entières), pour
 * refléter ce que l'artisan paie réellement, chutes comprises.
 *
 * Répartition par RÔLE (robuste, indépendante des sections) :
 *  - liteaux / contre-liteaux           → facturés au ml
 *  - tout le reste (chevrons, pannes, fermes) → bois de structure, facturé au m³
 *
 * La chute du débit est répartie proportionnellement via un ratio acheté/brut
 * calculé par section. Sur sections distinctes, le résultat est identique à un
 * comptage direct du débit ; sur sections partagées, la répartition reste juste.
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
  elements: Element[],
  debit: PlanDebit,
): Devis {
  const prix = p.prix;

  // Ratio acheté/brut par section (répartit la chute proportionnellement).
  const ratioParSection = new Map<string, number>();
  for (const s of debit.sections) {
    ratioParSection.set(s.sectionLabel, s.mlBrut > 0 ? s.mlAchete / s.mlBrut : 1);
  }

  let volumeStructureM3 = 0;
  let mlLiteau = 0;
  let mlContre = 0;
  for (const el of elements) {
    const ratio = ratioParSection.get(labelSection(el.section)) ?? 1;
    const mlAchete = el.quantite * el.longueurM * ratio;
    if (el.role === "liteau") {
      mlLiteau += mlAchete;
    } else if (el.role === "contre_liteau") {
      mlContre += mlAchete;
    } else {
      volumeStructureM3 += mlAchete * aireSectionM2(el.section);
    }
  }

  const surface = geo.surfaceToitureM2;
  const heuresMo = prix.heuresParM2 * surface;

  const lignes: LigneDevis[] = [];
  if (volumeStructureM3 > 0) {
    lignes.push(
      ligne(
        "Bois de structure (chevrons, pannes, fermes)",
        Math.round(volumeStructureM3 * 1000) / 1000,
        "m³",
        p.essence.prixM3Cents,
      ),
    );
  }
  if (mlLiteau > 0) {
    lignes.push(ligne("Liteaux", Math.round(mlLiteau * 100) / 100, "ml", prix.liteauMlCents));
  }
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
