import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import { genererOssature3D } from "../src/engine/ossature.ts";
import { etudier } from "../src/engine/etude.ts";
import type { RoleElement } from "../src/domain/types.ts";
import { closeTo } from "./helpers.ts";

function projetCroupe() {
  const base = projetParDefaut();
  return projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "croupe" } });
}

describe("croupe — géométrie (10×8, pente 45°)", () => {
  const g = calculerGeometrie(projetCroupe());

  it("4 pans", () => assert.equal(g.nbPans, 4));
  it("surface = (L+2d)(W+2d)/cos α ≈ 134,4 m²", () => closeTo(g.surfaceToitureM2, 134.4, 1));
  it("faîtage raccourci = L − W = 2 m", () => closeTo(g.longueurFaitageM, 2, 6));
  it("arêtier = (W/2)·√(2+tan²α) ≈ 6,93 m", () => closeTo(g.longueurAretierM, 6.928, 2));
});

describe("croupe — nomenclature", () => {
  const p = projetCroupe();
  const nom = genererNomenclature(p);
  const q = (role: RoleElement) =>
    nom.elements.filter((e) => e.role === role).reduce((s, e) => s + e.quantite, 0);

  it("marquée comme estimation", () => assert.equal(nom.estimation, true));
  it("4 arêtiers exacts", () => assert.equal(q("aretier"), 4));
  it("1 faîtière (raccourcie)", () => assert.equal(q("panne_faitiere"), 1));
  it("4 sablières de périmètre", () => assert.equal(q("panne_sabliere"), 4));
  it("aucune ferme", () => {
    assert.equal(q("ferme_entrait"), 0);
    assert.equal(q("ferme_arbaletrier"), 0);
    assert.equal(q("ferme_poincon"), 0);
  });
  it("chevrons & liteaux présents et étiquetés estimés", () => {
    assert.ok(q("chevron") > 0);
    assert.ok(q("liteau") > 0);
    assert.ok(nom.elements.find((e) => e.role === "chevron")!.nom.includes("estimé"));
  });
});

describe("croupe — alerte & ossature", () => {
  it("etudier remonte une alerte d'estimation croupe", () => {
    const e = etudier(projetCroupe());
    assert.ok(e.alertes.some((a) => a.message.toLowerCase().includes("croupe")));
  });

  it("l'ossature 3D contient 4 arêtiers et est finie", () => {
    const p = projetCroupe();
    const poutres = genererOssature3D(p, calculerGeometrie(p));
    assert.equal(poutres.filter((x) => x.role === "aretier").length, 4);
    for (const b of poutres) for (const v of [...b.a, ...b.b]) assert.ok(Number.isFinite(v));
  });
});
