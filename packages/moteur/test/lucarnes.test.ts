import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { metreLucarnes } from "../src/engine/lucarnes.ts";
import { etudier } from "../src/engine/etude.ts";
import type { Lucarne, ParametresProjet } from "../src/domain/types.ts";

const avec = (lucarnes: Lucarne[]): ParametresProjet => {
  const base = projetParDefaut();
  return { ...base, toiture: { ...base.toiture, lucarnes } };
};

const gable: Lucarne = {
  type: "deux_pans",
  largeurM: 1.2,
  hauteurFaceM: 1,
  avanceeM: 1.5,
  positionXM: 5,
  cote: "avant",
};

describe("metreLucarnes", () => {
  it("aucune lucarne ⇒ métré nul", () => {
    const m = metreLucarnes(projetParDefaut());
    assert.equal(m.nb, 0);
    assert.equal(m.surfaceM2, 0);
    assert.equal(m.mlNoues, 0);
    assert.equal(m.elements.length, 0);
  });

  it("lucarne à deux pans : surface > 0, 2 noues, ossature présente, valeurs finies", () => {
    const m = metreLucarnes(avec([gable]));
    assert.equal(m.nb, 1);
    assert.ok(m.surfaceM2 > 0);
    assert.ok(m.mlNoues > 0);
    const noue = m.elements.find((e) => e.role === "noue");
    assert.equal(noue?.quantite, 2);
    assert.ok(m.elements.some((e) => e.nom === "Faîtière de lucarne"));
    for (const e of m.elements) {
      assert.ok(Number.isFinite(e.longueurM) && e.longueurM > 0);
      assert.ok(Number.isFinite(e.quantite) && e.quantite > 0);
    }
  });

  it("chien-assis : 1 versant, surface et noues > 0", () => {
    const m = metreLucarnes(avec([{ ...gable, type: "chien_assis" }]));
    assert.ok(m.surfaceM2 > 0 && m.mlNoues > 0);
  });

  it("surface et noues croissent avec le nombre de lucarnes", () => {
    const un = metreLucarnes(avec([gable]));
    const deux = metreLucarnes(avec([gable, { ...gable, positionXM: 8 }]));
    assert.ok(deux.surfaceM2 > un.surfaceM2);
    assert.ok(deux.mlNoues > un.mlNoues);
  });
});

describe("etudier — lucarnes intégrées", () => {
  it("ajoute surface et devis vs sans lucarne, marque estimation + alerte", () => {
    const ref = etudier(projetParDefaut());
    const e = etudier(avec([gable]));
    assert.ok(e.geometrie.surfaceToitureM2 > ref.geometrie.surfaceToitureM2);
    assert.ok(e.devis.totalTtcCents > ref.devis.totalTtcCents);
    assert.equal(e.nomenclature.estimation, true);
    assert.ok(e.alertes.some((x) => x.message.includes("lucarne")));
  });

  it("largeur de lucarne nulle ⇒ bloquant", () => {
    assert.throws(() => etudier(avec([{ ...gable, largeurM: 0 }])));
  });

  it("lucarne surdimensionnée : alerte + métré plafonné (pas de surface aberrante)", () => {
    const enorme = avec([{ ...gable, largeurM: 50, avanceeM: 50, hauteurFaceM: 50 }]);
    const e = etudier(enorme);
    assert.ok(e.alertes.some((x) => x.message.includes("dépassant le pan")));
    // surface composée totale reste de l'ordre du toit (132 m²), pas ×20
    assert.ok(e.geometrie.surfaceToitureM2 < 3 * etudier(projetParDefaut()).geometrie.surfaceToitureM2);
  });

  it("pan porteur invalide ⇒ bloquant", () => {
    assert.throws(() => etudier(avec([{ ...gable, cote: "haut" as unknown as "avant" }])));
  });
});
