import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { coupeTransversaleSvg } from "../src/export/schema-svg.ts";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { etudier } from "../src/engine/etude.ts";

describe("coupeTransversaleSvg", () => {
  const e = etudier(projetParDefaut());
  const svg = coupeTransversaleSvg({
    largeurM: e.projet.batiment.largeurM,
    hauteurFaitageM: e.geometrie.hauteurFaitageM,
    penteDeg: e.projet.toiture.penteDeg,
    nbPannesIntermParPan: e.nomenclature.nbPannesIntermediairesParPan,
  });

  it("produit un SVG valide avec viewBox", () => {
    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.includes('viewBox="0 0 440 320"'));
    assert.ok(svg.trimEnd().endsWith("</svg>"));
  });

  it("contient le triangle (polygon) et le poinçon", () => {
    assert.ok(svg.includes("<polygon"));
    assert.ok(svg.includes("stroke-dasharray")); // poinçon en pointillés
  });

  it("le nombre de repères de pannes = 3 + 2·nbIntermédiaires", () => {
    const n = e.nomenclature.nbPannesIntermediairesParPan;
    const attendus = 3 + 2 * n;
    // cercles de repère + 1 cercle de légende
    const cercles = (svg.match(/<circle /g) ?? []).length;
    assert.equal(cercles, attendus + 1);
  });

  it("affiche les cotes W et h", () => {
    assert.ok(svg.includes(`W = ${e.projet.batiment.largeurM.toFixed(2)} m`));
    assert.ok(svg.includes(`h = ${e.geometrie.hauteurFaitageM.toFixed(2)} m`));
  });

  it("reste robuste à une pente faible (échelle finie)", () => {
    const svgFaible = coupeTransversaleSvg({
      largeurM: 8,
      hauteurFaitageM: 0.4,
      penteDeg: 6,
      nbPannesIntermParPan: 0,
    });
    assert.ok(svgFaible.includes("<polygon"));
    assert.ok(!svgFaible.includes("NaN"));
    assert.ok(!svgFaible.includes("Infinity"));
  });
});
