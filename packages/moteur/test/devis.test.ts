import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import { planifierDebit } from "../src/engine/debit.ts";
import { chiffrerDevis, appliquerRemise } from "../src/engine/devis.ts";
import { closeTo } from "./helpers.ts";

function devisDeReference() {
  const p = projetParDefaut();
  const g = calculerGeometrie(p);
  const nom = genererNomenclature(p, g);
  const debit = planifierDebit(nom.elements, p.debit.barresCommercialesM, p.debit.kerfMm);
  return { p, g, devis: chiffrerDevis(p, g, nom.elements, debit) };
}

describe("chiffrerDevis — cohérence comptable", () => {
  const { p, g, devis } = devisDeReference();

  it("le total HT est exactement la somme des lignes", () => {
    const somme = devis.lignes.reduce((s, l) => s + l.totalHtCents, 0);
    assert.equal(devis.totalHtCents, somme);
  });

  it("TVA = arrondi(HT × taux / 100) et TTC = HT + TVA", () => {
    assert.equal(devis.tvaCents, Math.round((devis.totalHtCents * devis.tauxTvaPct) / 100));
    assert.equal(devis.totalTtcCents, devis.totalHtCents + devis.tvaCents);
  });

  it("toutes les lignes ont une quantité et un total positifs", () => {
    for (const l of devis.lignes) {
      assert.ok(l.quantite > 0);
      assert.ok(l.totalHtCents > 0);
    }
  });

  it("golden : TTC de référence inchangé (16 841,89 €)", () => {
    // Verrou de non-régression : le refactor de répartition ne doit pas bouger le total.
    assert.equal(devis.totalTtcCents, 1684189);
  });

  it("la ligne main-d'œuvre = heuresParM2 × surface × taux horaire", () => {
    const mo = devis.lignes.find((l) => l.libelle.startsWith("Main-d'œuvre"));
    assert.ok(mo !== undefined);
    const heuresAttendues = Math.round(p.prix.heuresParM2 * g.surfaceToitureM2 * 100) / 100;
    closeTo(mo.quantite, heuresAttendues, 2);
    assert.equal(mo.totalHtCents, Math.round(mo.quantite * p.prix.mainOeuvreHeureCents));
  });

  it("passer en TVA 20 % augmente la TVA et le TTC, pas le HT", () => {
    const base = projetParDefaut();
    const p20 = projetParDefaut({ ...base, prix: { ...base.prix, tauxTvaPct: 20 } });
    const g20 = calculerGeometrie(p20);
    const nom20 = genererNomenclature(p20, g20);
    const debit20 = planifierDebit(nom20.elements, p20.debit.barresCommercialesM, p20.debit.kerfMm);
    const devis20 = chiffrerDevis(p20, g20, nom20.elements, debit20);
    assert.equal(devis20.totalHtCents, devis.totalHtCents);
    assert.ok(devis20.tvaCents > devis.tvaCents);
    assert.ok(devis20.totalTtcCents > devis.totalTtcCents);
  });

  it("appliquerRemise sans remise = totaux du devis brut", () => {
    const df = appliquerRemise(devis);
    assert.equal(df.totalHtCents, devis.totalHtCents);
    assert.equal(df.totalTtcCents, devis.totalTtcCents);
    assert.equal(df.remiseCents, 0);
    assert.equal(df.acompteCents, 0);
  });

  it("remise 10 % réduit le HT et recalcule TVA/TTC", () => {
    const df = appliquerRemise(devis, 10);
    assert.equal(df.remiseCents, Math.round(devis.totalHtCents * 0.1));
    assert.equal(df.totalHtCents, df.sousTotalHtCents - df.remiseCents);
    assert.equal(df.tvaCents, Math.round((df.totalHtCents * df.tauxTvaPct) / 100));
    assert.equal(df.totalTtcCents, df.totalHtCents + df.tvaCents);
    assert.ok(df.totalTtcCents < devis.totalTtcCents);
  });

  it("acompte = % du TTC", () => {
    const df = appliquerRemise(devis, 0, 30);
    assert.equal(df.acompteCents, Math.round(df.totalTtcCents * 0.3));
  });

  it("sections liteau = contre-liteau partagées : répartition correcte (régression)", () => {
    const base = projetParDefaut();
    const sectionCommune = { largeurMm: 27, hauteurMm: 40 };
    const p2 = projetParDefaut({
      ...base,
      charpente: {
        ...base.charpente,
        sections: { ...base.charpente.sections, liteau: sectionCommune, contreLiteau: sectionCommune },
      },
    });
    const g2 = calculerGeometrie(p2);
    const nom2 = genererNomenclature(p2, g2);
    const debit2 = planifierDebit(nom2.elements, p2.debit.barresCommercialesM, p2.debit.kerfMm);
    const devis2 = chiffrerDevis(p2, g2, nom2.elements, debit2);
    // Les deux lignes existent et sont positives (avant le fix, les liteaux tombaient à 0).
    const liteaux = devis2.lignes.find((l) => l.libelle === "Liteaux");
    const contre = devis2.lignes.find((l) => l.libelle === "Contre-liteaux");
    assert.ok(liteaux && liteaux.quantite > 0, "ligne Liteaux présente et > 0");
    assert.ok(contre && contre.quantite > 0, "ligne Contre-liteaux présente et > 0");
  });
});
