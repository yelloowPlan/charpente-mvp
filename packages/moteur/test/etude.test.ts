import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { etudier, validerProjet, ErreurValidation } from "../src/engine/etude.ts";

describe("validerProjet — règles bloquantes", () => {
  it("le projet de référence est valide (aucun bloquant)", () => {
    const bloquants = validerProjet(projetParDefaut()).filter((a) => a.niveau === "bloquant");
    assert.equal(bloquants.length, 0);
  });

  it("rejette une pente hors bornes", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, penteDeg: 95 } });
    assert.ok(validerProjet(p).some((a) => a.niveau === "bloquant"));
  });

  it("rejette une typologie non supportée (hors MVP)", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "appentis" } });
    assert.ok(validerProjet(p).some((a) => a.message.includes("deux pans")));
  });

  it("rejette une largeur nulle", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, batiment: { ...base.batiment, largeurM: 0 } });
    assert.ok(validerProjet(p).some((a) => a.niveau === "bloquant"));
  });
});

describe("etudier — pipeline complet", () => {
  it("produit une étude complète pour le projet de référence", () => {
    const e = etudier(projetParDefaut());
    assert.ok(e.geometrie.surfaceToitureM2 > 0);
    assert.ok(e.nomenclature.elements.length > 0);
    assert.ok(e.debit.sections.length > 0);
    assert.ok(e.devis.totalTtcCents > 0);
  });

  it("inclut le disclaimer structurel (info)", () => {
    const e = etudier(projetParDefaut());
    assert.ok(e.alertes.some((a) => a.niveau === "info" && a.message.includes("Eurocode 5")));
  });

  it("lève ErreurValidation si un paramètre est bloquant", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, penteDeg: -3 } });
    assert.throws(() => etudier(p), ErreurValidation);
  });
});
