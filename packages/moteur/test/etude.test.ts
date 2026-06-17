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

  it("accepte l'appentis (typologie supportée)", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "appentis" } });
    assert.equal(validerProjet(p).filter((a) => a.niveau === "bloquant").length, 0);
  });

  it("rejette une charpente hors périmètre (fermette)", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, charpente: { ...base.charpente, type: "fermette" } });
    assert.ok(validerProjet(p).some((a) => a.niveau === "bloquant"));
  });

  it("rejette une largeur nulle", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, batiment: { ...base.batiment, largeurM: 0 } });
    assert.ok(validerProjet(p).some((a) => a.niveau === "bloquant"));
  });

  it("rejette une longueur de barre commerciale ≤ 0", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, debit: { ...base.debit, barresCommercialesM: [4, 0, 6] } });
    assert.ok(validerProjet(p).some((a) => a.message.includes("barres")));
  });

  it("rejette un prix négatif", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, prix: { ...base.prix, couvertureM2Cents: -100 } });
    assert.ok(validerProjet(p).some((a) => a.message.includes("négatif")));
  });

  it("rejette une charge de neige négative", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, charges: { neigeKNm2: -1 } });
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

  it("produit une note de calcul (flèche + flexion ELU) cohérente", () => {
    const e = etudier(projetParDefaut());
    const vs = e.verifStructure;
    assert.equal(vs.porteeAdmissibleM, e.nomenclature.porteeAdmissibleChevronM);
    assert.equal(vs.ratioFleche, 300);
    assert.ok(vs.chargeEluKNm2 > 0 && vs.contrainteFlexionMPa > 0);
    assert.ok(vs.fmdMPa > 10 && vs.fmdMPa < 20); // C24 ≈ 14,8 MPa
    assert.ok(vs.tauxFlexionPct > 0 && vs.tauxFlexionPct < 100); // dimensionnement sain
  });

  it("composition multi-volumes : surface et devis augmentés + alerte raccord", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const compose = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T" as const, secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    };
    const ref = etudier(base);
    const e = etudier(compose);
    assert.ok(e.geometrie.surfaceToitureM2 > ref.geometrie.surfaceToitureM2);
    assert.ok(e.devis.totalTtcCents > ref.devis.totalTtcCents);
    assert.ok(e.alertes.some((a) => a.message.includes("Toiture composée")));
  });

  it("composition deux_pans : saillie ≤ 0 est bloquante", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const saillieNulle = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T" as const, secondaire: { largeurM: W, longueurM: 0, positionM: 5 } },
      },
    };
    assert.throws(() => etudier(saillieNulle), ErreurValidation);
  });

  it("composition sur croupe : aile ignorée gracieusement (attention, pas de crash)", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const surCroupe = {
      ...base,
      toiture: {
        ...base.toiture,
        typologie: "croupe" as const,
        composition: { raccord: "T" as const, secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    };
    const e = etudier(surCroupe); // ne doit pas lever
    const croupeSeule = etudier({ ...base, toiture: { ...base.toiture, typologie: "croupe" as const } });
    assert.equal(e.geometrie.surfaceToitureM2, croupeSeule.geometrie.surfaceToitureM2); // aile ignorée
    assert.ok(e.alertes.some((x) => x.message.includes("aile ignorée")));
  });

  it("composition : largeur d'aile ≠ portée → attention non bloquante", () => {
    const base = projetParDefaut();
    const p = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: {
          raccord: "T" as const,
          secondaire: { largeurM: base.batiment.largeurM + 2, longueurM: 4, positionM: 5 },
        },
      },
    };
    const alertes = validerProjet(p);
    assert.equal(alertes.filter((x) => x.niveau === "bloquant").length, 0);
    assert.ok(alertes.some((x) => x.niveau === "attention" && x.message.includes("largeur d'aile")));
  });

  it("lève ErreurValidation si un paramètre est bloquant", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, penteDeg: -3 } });
    assert.throws(() => etudier(p), ErreurValidation);
  });
});
