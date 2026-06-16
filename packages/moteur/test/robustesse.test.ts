import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { etudier } from "../src/engine/etude.ts";
import { etudeVersHtml } from "../src/export/html.ts";
import { nomenclatureVersCsv, debitVersCsv, devisVersCsv } from "../src/export/csv.ts";
import { coupeTransversaleSvg } from "../src/export/schema-svg.ts";
import type { ParametresProjet, TypeToiture } from "../src/domain/types.ts";

/**
 * Filet de robustesse : balaie un large espace de configurations VALIDES et
 * vérifie qu'aucune ne produit de valeur non finie, ni de NaN/Infinity/undefined
 * dans un livrable, et que les totaux restent cohérents. Garde-fou anti-régression.
 */

const base = projetParDefaut();
const typologies: TypeToiture[] = ["deux_pans", "appentis", "croupe"];
const pentes = [6, 30, 45, 60, 80];
const tailles: [number, number][] = [
  [4, 3],
  [10, 8],
  [40, 15],
];

const configs: ParametresProjet[] = [];
for (const typologie of typologies) {
  for (const penteDeg of pentes) {
    for (const [longueurM, largeurM] of tailles) {
      for (const ecranSousToiture of [true, false]) {
        configs.push(
          projetParDefaut({
            ...base,
            batiment: { ...base.batiment, longueurM, largeurM },
            toiture: { ...base.toiture, typologie, penteDeg },
            charpente: { ...base.charpente, ecranSousToiture },
          }),
        );
      }
    }
  }
}

const fini = (...ns: number[]): boolean => ns.every((n) => Number.isFinite(n));

describe("robustesse — matrice de configurations valides", () => {
  for (const p of configs) {
    const t = p.toiture;
    const nom = `${t.typologie} ${p.batiment.longueurM}×${p.batiment.largeurM} pente ${t.penteDeg}° écran=${p.charpente.ecranSousToiture}`;
    it(nom, () => {
      const e = etudier(p);

      // Géométrie finie et positive
      assert.ok(
        fini(e.geometrie.rampantM, e.geometrie.hauteurFaitageM, e.geometrie.surfaceToitureM2),
        "géométrie finie",
      );
      assert.ok(e.geometrie.surfaceToitureM2 > 0, "surface > 0");

      // Devis sain
      assert.ok(Number.isInteger(e.devis.totalTtcCents) && e.devis.totalTtcCents > 0, "TTC entier > 0");
      assert.equal(
        e.devis.totalHtCents,
        e.devis.lignes.reduce((s, l) => s + l.totalHtCents, 0),
        "HT = somme des lignes",
      );

      // Débit cohérent
      for (const s of e.debit.sections) {
        assert.ok(s.mlAchete >= s.mlBrut - 1e-9, "acheté ≥ brut");
        assert.ok(fini(s.volumeAcheteM3) && s.volumeAcheteM3 >= 0, "volume fini ≥ 0");
      }

      // Aucun NaN/Infinity/undefined dans les livrables
      const svg = coupeTransversaleSvg({
        largeurM: p.batiment.largeurM,
        hauteurFaitageM: e.geometrie.hauteurFaitageM,
        penteDeg: t.penteDeg,
        nbPannesIntermParPan: e.nomenclature.nbPannesIntermediairesParPan,
        nbPans: e.geometrie.nbPans,
      });
      const sorties = [
        etudeVersHtml(e),
        svg,
        devisVersCsv(e.devis),
        debitVersCsv(e.debit),
        nomenclatureVersCsv(e.nomenclature),
      ];
      for (const sortie of sorties) {
        assert.ok(!sortie.includes("NaN"), "pas de NaN");
        assert.ok(!sortie.includes("Infinity"), "pas de Infinity");
        assert.ok(!sortie.includes("undefined"), "pas de undefined");
      }
    });
  }
});
