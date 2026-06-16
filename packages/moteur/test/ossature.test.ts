import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import { genererOssature3D } from "../src/engine/ossature.ts";

function compter(role: string, projet = projetParDefaut()) {
  const g = calculerGeometrie(projet);
  const poutres = genererOssature3D(projet, g);
  return poutres.filter((x) => x.role === role).length;
}

describe("genererOssature3D — deux pans (référence)", () => {
  const p = projetParDefaut();
  const g = calculerGeometrie(p);
  const nom = genererNomenclature(p, g);
  const poutres = genererOssature3D(p, g);

  it("autant de chevrons que la nomenclature (48)", () => {
    const nbChev = nom.elements.find((e) => e.role === "chevron")!.quantite;
    assert.equal(compter("chevron"), nbChev);
  });

  it("2 sablières + 1 faîtière", () => {
    assert.equal(compter("sabliere"), 2);
    assert.equal(compter("faitiere"), 1);
  });

  it("poutres de ferme cohérentes (3 fermes → 3 entraits, 6 arba, 3 poinçons)", () => {
    assert.equal(compter("entrait"), 3);
    assert.equal(compter("arbaletrier"), 6);
    assert.equal(compter("poincon"), 3);
  });

  it("toutes les coordonnées sont finies", () => {
    for (const b of poutres) {
      for (const v of [...b.a, ...b.b]) assert.ok(Number.isFinite(v));
    }
  });

  it("le faîtage est à la hauteur calculée", () => {
    const faite = poutres.find((b) => b.role === "faitiere")!;
    assert.equal(faite.a[1], g.hauteurFaitageM);
  });
});

describe("genererOssature3D — appentis", () => {
  const base = projetParDefaut();
  const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "appentis" } });

  it("aucune ferme (entrait/arbalétrier/poinçon)", () => {
    assert.equal(compter("entrait", p), 0);
    assert.equal(compter("arbaletrier", p), 0);
    assert.equal(compter("poincon", p), 0);
  });

  it("1 sablière basse + 1 panne haute, chevrons présents", () => {
    assert.equal(compter("sabliere", p), 1);
    assert.equal(compter("faitiere", p), 1);
    assert.ok(compter("chevron", p) > 0);
  });
});
