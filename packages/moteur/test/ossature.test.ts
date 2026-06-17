import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import {
  genererOssature3D,
  genererLattage3D,
  genererCouverture3D,
  genererOssatureComposee3D,
  genererLattageComposee3D,
  genererCouvertureComposee3D,
} from "../src/engine/ossature.ts";
import type { ParametresProjet } from "../src/domain/types.ts";

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

describe("genererLattage3D & genererCouverture3D", () => {
  const cas: Array<["deux_pans" | "appentis" | "croupe", number]> = [
    ["deux_pans", 2],
    ["appentis", 1],
    ["croupe", 4],
  ];
  for (const [typologie, nbPans] of cas) {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie } });
    const g = calculerGeometrie(p);

    it(`${typologie} : lattage présent et fini`, () => {
      const lit = genererLattage3D(p, g);
      assert.ok(lit.length > 0);
      for (const b of lit) for (const v of [...b.a, ...b.b]) assert.ok(Number.isFinite(v));
    });

    it(`${typologie} : ${nbPans} pan(s) de couverture, sommets finis`, () => {
      const pans = genererCouverture3D(p, g);
      assert.equal(pans.length, nbPans);
      for (const pan of pans) {
        assert.ok(pan.points.length >= 3);
        for (const pt of pan.points) for (const v of pt) assert.ok(Number.isFinite(v));
      }
    });
  }
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

describe("ossature 3D composée — multi-volumes (RFC 0001, Lot A4)", () => {
  const base = projetParDefaut();
  const W = base.batiment.largeurM;
  const composer = (raccord: "L" | "T" | "croix"): ParametresProjet => ({
    ...base,
    toiture: {
      ...base.toiture,
      composition: { raccord, secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
    },
  });

  it("sans composition : identique à l'ossature mono-volume (rétro-compat)", () => {
    assert.equal(genererOssatureComposee3D(base).length, genererOssature3D(base).length);
    assert.equal(genererLattageComposee3D(base).length, genererLattage3D(base).length);
    assert.equal(genererCouvertureComposee3D(base).length, genererCouverture3D(base).length);
  });

  it("T : 2 noues, plus de poutres et 2 pans de couverture en plus", () => {
    const o = genererOssatureComposee3D(composer("T"));
    assert.equal(o.filter((x) => x.role === "noue").length, 2);
    assert.ok(o.length > genererOssature3D(base).length);
    assert.equal(
      genererCouvertureComposee3D(composer("T")).length,
      genererCouverture3D(base).length + 2,
    );
  });

  it("L : 1 noue", () => {
    const o = genererOssatureComposee3D(composer("L"));
    assert.equal(o.filter((x) => x.role === "noue").length, 1);
  });

  it("croix : 4 noues, ailes des deux côtés (z<0 et z>0)", () => {
    const o = genererOssatureComposee3D(composer("croix"));
    assert.equal(o.filter((x) => x.role === "noue").length, 4);
    const faitieres = o.filter((x) => x.role === "faitiere");
    // pignons d'aile (point b) de part et d'autre du principal
    assert.ok(faitieres.some((f) => f.b[2] < 0) && faitieres.some((f) => f.b[2] > 0));
    for (const x of o) for (const v of [...x.a, ...x.b]) assert.ok(Number.isFinite(v));
  });

  it("aucune coordonnée NaN dans l'ossature composée", () => {
    const o = genererOssatureComposee3D(composer("T"));
    for (const x of o) {
      for (const v of [...x.a, ...x.b]) assert.ok(Number.isFinite(v));
    }
  });

  it("Lot B : aile plus étroite → faîtière d'aile plus basse + pénétration (pas au faîtage)", () => {
    const etroit: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W - 3, longueurM: 4, positionM: 5 } },
      },
    };
    const faitiereAileY = (p: ParametresProjet) => {
      const o = genererOssatureComposee3D(p);
      // dernière faîtière ajoutée = celle de l'aile (apex Y)
      const f = o.filter((x) => x.role === "faitiere");
      return f[f.length - 1].a[1];
    };
    assert.ok(faitiereAileY(etroit) < faitiereAileY(composer("T"))); // h2 < h1
    for (const x of genererOssatureComposee3D(etroit)) {
      for (const v of [...x.a, ...x.b]) assert.ok(Number.isFinite(v));
    }
  });
});
