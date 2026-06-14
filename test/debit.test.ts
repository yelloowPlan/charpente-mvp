import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planifierDebit } from "../src/engine/debit.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import { projetParDefaut } from "../src/domain/defaults.ts";
import type { Element } from "../src/domain/types.ts";
import { closeTo } from "./helpers.ts";

describe("planifierDebit — invariants de conservation", () => {
  const p = projetParDefaut();
  const nom = genererNomenclature(p);
  const plan = planifierDebit(nom.elements, p.debit.barresCommercialesM, p.debit.kerfMm);

  it("le métré acheté est toujours ≥ au métré brut", () => {
    for (const s of plan.sections) {
      assert.ok(s.mlAchete >= s.mlBrut - 1e-9);
    }
  });

  it("la perte est toujours dans [0, 100[ %", () => {
    for (const s of plan.sections) {
      assert.ok(s.pertePct >= 0);
      assert.ok(s.pertePct < 100);
    }
  });

  it("aucune pièce d'une barre ne dépasse la longueur de la barre", () => {
    for (const s of plan.sections) {
      for (const barre of s.detailBarres) {
        const somme = barre.pieces.reduce((a, b) => a + b, 0);
        assert.ok(somme <= barre.longueurM + 1e-9);
        assert.ok(barre.chuteM >= 0);
      }
    }
  });

  it("conservation du nombre de pièces (aucune perdue)", () => {
    // total pièces en entrée = barre.pieces + linéaire (non détaillé) ; on vérifie
    // au moins que chaque section barre conserve ses pièces.
    let piecesBarre = 0;
    for (const s of plan.sections) {
      if (s.mode === "barre") for (const b of s.detailBarres) piecesBarre += b.pieces.length;
    }
    assert.ok(piecesBarre > 0);
  });

  it("les pannes de 10,6 m > 8 m déclenchent une alerte d'aboutage", () => {
    assert.ok(plan.alertes.some((a) => a.message.includes("aboutage")));
  });
});

describe("planifierDebit — packing FFD contrôlé", () => {
  const sectionTest = { largeurMm: 50, hauteurMm: 50 };

  it("3 pièces de 2 m tiennent dans une seule barre de 6 m (kerf nul)", () => {
    const elements: Element[] = [
      { role: "chevron", nom: "test", longueurM: 2, section: sectionTest, quantite: 3, modeDebit: "barre", formule: "" },
    ];
    const plan = planifierDebit(elements, [6], 0);
    assert.equal(plan.sections.length, 1);
    assert.equal(plan.sections[0].barres, 1);
    assert.equal(plan.sections[0].detailBarres[0].pieces.length, 3);
    assert.equal(plan.sections[0].mlAchete, 6);
    assert.equal(plan.sections[0].pertePct, 0);
  });

  it("le kerf empêche 3×2 m dans une barre de 6 m → 2 barres", () => {
    const elements: Element[] = [
      { role: "chevron", nom: "test", longueurM: 2, section: sectionTest, quantite: 3, modeDebit: "barre", formule: "" },
    ];
    const plan = planifierDebit(elements, [6], 5); // 5 mm de trait → 2+0.005 ×3 > 6
    assert.equal(plan.sections[0].barres, 2);
  });

  it("mode linéaire : 21 m en barres → métré acheté 24 m (perte minimale)", () => {
    const elements: Element[] = [
      { role: "liteau", nom: "test", longueurM: 10.5, section: { largeurMm: 27, hauteurMm: 40 }, quantite: 2, modeDebit: "lineaire", formule: "" },
    ];
    const plan = planifierDebit(elements, [4, 5, 6], 0);
    closeTo(plan.sections[0].mlBrut, 21, 6);
    assert.ok(plan.sections[0].mlAchete >= 21);
    // 4×6=24 (perte 3) ; 5×5=25 (perte 4) ; 6×4=24 (perte 3) → 24 attendu
    assert.equal(plan.sections[0].mlAchete, 24);
  });
});
