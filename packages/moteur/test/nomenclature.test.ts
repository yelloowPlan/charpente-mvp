import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { genererNomenclature, genererNomenclatureComposee } from "../src/engine/nomenclature.ts";
import type { ParametresProjet, RoleElement } from "../src/domain/types.ts";
import { closeTo } from "./helpers.ts";

const nom = genererNomenclature(projetParDefaut());

function quantite(role: RoleElement): number {
  return nom.elements.filter((e) => e.role === role).reduce((s, e) => s + e.quantite, 0);
}
function longueur(role: RoleElement): number {
  const el = nom.elements.find((e) => e.role === role);
  if (!el) throw new Error(`rôle absent: ${role}`);
  return el.longueurM;
}

describe("genererNomenclature — exemple de référence", () => {
  it("48 chevrons de ~6,22 m", () => {
    assert.equal(quantite("chevron"), 48);
    closeTo(longueur("chevron"), 6.2225, 3);
  });

  it("40 rangs de liteaux de 10,6 m", () => {
    assert.equal(quantite("liteau"), 40);
    closeTo(longueur("liteau"), 10.6, 6);
  });

  it("contre-liteaux = nombre de chevrons (écran activé)", () => {
    assert.equal(quantite("contre_liteau"), 48);
  });

  it("désactiver l'écran supprime les contre-liteaux", () => {
    const p = projetParDefaut();
    const nom2 = genererNomenclature({
      ...p,
      charpente: { ...p.charpente, ecranSousToiture: false },
    });
    assert.equal(nom2.elements.some((e) => e.role === "contre_liteau"), false);
  });

  it("1 faîtière + 2 sablières", () => {
    assert.equal(quantite("panne_faitiere"), 1);
    assert.equal(quantite("panne_sabliere"), 2);
  });

  it("portée admissible ≈ 2,49 m → 2 pannes intermédiaires/pan (4 au total)", () => {
    closeTo(nom.porteeAdmissibleChevronM, 2.49, 1);
    assert.equal(nom.nbPannesIntermediairesParPan, 2);
    assert.equal(quantite("panne_intermediaire"), 4);
  });

  it("3 fermes : 3 entraits de 8 m, 6 arbalétriers, 3 poinçons de 4 m", () => {
    assert.equal(quantite("ferme_entrait"), 3);
    closeTo(longueur("ferme_entrait"), 8, 6);
    assert.equal(quantite("ferme_arbaletrier"), 6);
    closeTo(longueur("ferme_arbaletrier"), 5.65685, 4);
    assert.equal(quantite("ferme_poincon"), 3);
    closeTo(longueur("ferme_poincon"), 4, 6);
  });

  it("toutes les pièces portent une formule de traçabilité", () => {
    for (const el of nom.elements) assert.ok(el.formule.length > 0);
  });
});

describe("genererNomenclature — appentis (mono-pan)", () => {
  const base = projetParDefaut();
  const nomA = genererNomenclature(
    projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "appentis" } }),
  );
  const q = (role: RoleElement) =>
    nomA.elements.filter((e) => e.role === role).reduce((s, e) => s + e.quantite, 0);

  it("24 chevrons (un seul pan)", () => {
    assert.equal(q("chevron"), 24);
  });

  it("liteaux = 38 rangs (un seul pan, rampant plus long)", () => {
    assert.equal(q("liteau"), 38);
  });

  it("1 panne haute + 1 sablière basse, pas de seconde sablière", () => {
    assert.equal(q("panne_faitiere"), 1);
    assert.equal(q("panne_sabliere"), 1);
  });

  it("4 pannes intermédiaires (un pan)", () => {
    assert.equal(nomA.nbPannesIntermediairesParPan, 4);
    assert.equal(q("panne_intermediaire"), 4);
  });

  it("aucune ferme (appentis)", () => {
    assert.equal(q("ferme_entrait"), 0);
    assert.equal(q("ferme_arbaletrier"), 0);
    assert.equal(q("ferme_poincon"), 0);
  });
});

describe("genererNomenclatureComposee — multi-volumes (RFC 0001, Lot A2)", () => {
  const base = projetParDefaut();
  const W = base.batiment.largeurM;

  function composer(raccord: "L" | "T"): ParametresProjet {
    return {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord, secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    };
  }

  it("sans composition : identique à la nomenclature mono-volume (rétro-compat)", () => {
    const a = genererNomenclatureComposee(base);
    const b = genererNomenclature(base);
    assert.equal(a.elements.length, b.elements.length);
    assert.equal(a.estimation, false);
  });

  it("T : 2 chevrons de noue, aile présente, marqué estimation", () => {
    const r = genererNomenclatureComposee(composer("T"));
    const noue = r.elements.find((e) => e.role === "noue");
    assert.ok(noue, "chevron de noue manquant");
    assert.equal(noue?.quantite, 2);
    assert.ok(r.elements.some((e) => e.nom.includes("(aile)")), "éléments d'aile manquants");
    assert.ok(r.elements.some((e) => e.nom === "Empannon de noue"), "empannons manquants");
    assert.equal(r.estimation, true);
  });

  it("L : 1 chevron de noue", () => {
    const r = genererNomenclatureComposee(composer("L"));
    const noue = r.elements.find((e) => e.role === "noue");
    assert.equal(noue?.quantite, 1);
  });

  it("conservateur : le bois composé ≥ bois principal seul (jamais de sous-métré)", () => {
    const compo = genererNomenclatureComposee(composer("T"));
    const principal = genererNomenclature(base);
    const vol = (els: typeof compo.elements) =>
      els
        .filter((e) => e.modeDebit === "barre")
        .reduce((s, e) => s + e.quantite * e.longueurM, 0);
    assert.ok(vol(compo.elements) > vol(principal.elements));
  });
});
