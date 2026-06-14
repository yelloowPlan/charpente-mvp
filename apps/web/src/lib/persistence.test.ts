import { describe, it, expect } from "vitest";
import { projetParDefaut } from "@charpente/moteur";
import type { Magasin } from "./persistence.ts";
import {
  listerProjets,
  enregistrerProjet,
  supprimerProjet,
  sauverBrouillon,
  chargerBrouillon,
  sauverEntreprise,
  chargerEntreprise,
  entrepriseVide,
  sauverDocument,
  chargerDocument,
  documentVide,
} from "./persistence.ts";

/** Faux magasin en mémoire (pas de navigateur requis). */
function fauxMagasin(): Magasin & { dump: Map<string, string> } {
  const m = new Map<string, string>();
  return {
    dump: m,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

let compteur = 0;
const genId = () => `id-${++compteur}`;

describe("persistence — projets", () => {
  it("liste vide au départ", () => {
    expect(listerProjets(fauxMagasin())).toEqual([]);
  });

  it("enregistre puis relit un projet", () => {
    const s = fauxMagasin();
    const liste = enregistrerProjet(s, "Chantier A", projetParDefaut(), "2026-06-14T10:00:00Z", genId);
    expect(liste).toHaveLength(1);
    expect(liste[0].nom).toBe("Chantier A");
    expect(listerProjets(s)).toHaveLength(1);
  });

  it("ré-enregistrer le même nom met à jour (pas de doublon)", () => {
    const s = fauxMagasin();
    enregistrerProjet(s, "A", projetParDefaut(), "2026-06-14T10:00:00Z", genId);
    const modifie = { ...projetParDefaut(), batiment: { ...projetParDefaut().batiment, longueurM: 99 } };
    const liste = enregistrerProjet(s, "A", modifie, "2026-06-14T11:00:00Z", genId);
    expect(liste).toHaveLength(1);
    expect(liste[0].projet.batiment.longueurM).toBe(99);
  });

  it("trie du plus récent au plus ancien", () => {
    const s = fauxMagasin();
    enregistrerProjet(s, "Ancien", projetParDefaut(), "2026-06-10T10:00:00Z", genId);
    enregistrerProjet(s, "Récent", projetParDefaut(), "2026-06-14T10:00:00Z", genId);
    expect(listerProjets(s).map((p) => p.nom)).toEqual(["Récent", "Ancien"]);
  });

  it("supprime par id", () => {
    const s = fauxMagasin();
    const liste = enregistrerProjet(s, "X", projetParDefaut(), "2026-06-14T10:00:00Z", genId);
    const apres = supprimerProjet(s, liste[0].id);
    expect(apres).toEqual([]);
    expect(listerProjets(s)).toEqual([]);
  });

  it("tolère un stockage corrompu (retourne liste vide)", () => {
    const s = fauxMagasin();
    s.setItem("charpente.projets.v1", "{ ceci n'est pas du JSON");
    expect(listerProjets(s)).toEqual([]);
  });
});

describe("persistence — brouillon", () => {
  it("aller-retour du projet de travail", () => {
    const s = fauxMagasin();
    expect(chargerBrouillon(s)).toBeNull();
    sauverBrouillon(s, projetParDefaut());
    const recharge = chargerBrouillon(s);
    expect(recharge?.batiment.largeurM).toBe(projetParDefaut().batiment.largeurM);
  });

  it("ignore un brouillon qui n'a pas la forme d'un projet", () => {
    const s = fauxMagasin();
    s.setItem("charpente.brouillon.v1", JSON.stringify({ nimporte: "quoi" }));
    expect(chargerBrouillon(s)).toBeNull();
  });
});

describe("persistence — entreprise", () => {
  it("entrepriseVide a tous les champs vides", () => {
    const e = entrepriseVide();
    expect(Object.values(e).every((v) => v === "")).toBe(true);
  });

  it("aller-retour du profil entreprise", () => {
    const s = fauxMagasin();
    expect(chargerEntreprise(s)).toBeNull();
    sauverEntreprise(s, { ...entrepriseVide(), raisonSociale: "Charpentes Dupont", siret: "123" });
    const recharge = chargerEntreprise(s);
    expect(recharge?.raisonSociale).toBe("Charpentes Dupont");
    expect(recharge?.siret).toBe("123");
  });

  it("ignore un profil corrompu / incomplet", () => {
    const s = fauxMagasin();
    s.setItem("charpente.entreprise.v1", JSON.stringify({ raisonSociale: "X" }));
    expect(chargerEntreprise(s)).toBeNull();
  });
});

describe("persistence — document de devis", () => {
  it("documentVide : client vide + validité 30 j", () => {
    const d = documentVide();
    expect(d.validiteJours).toBe(30);
    expect(d.client.nom).toBe("");
  });

  it("aller-retour du document", () => {
    const s = fauxMagasin();
    expect(chargerDocument(s)).toBeNull();
    sauverDocument(s, {
      client: { nom: "M. Martin", adresse: "3 rue X", codePostal: "73100", ville: "Aix" },
      numeroDevis: "DEV-1",
      validiteJours: 45,
    });
    const d = chargerDocument(s);
    expect(d?.client.nom).toBe("M. Martin");
    expect(d?.numeroDevis).toBe("DEV-1");
    expect(d?.validiteJours).toBe(45);
  });

  it("ignore un document corrompu (validité non numérique)", () => {
    const s = fauxMagasin();
    s.setItem(
      "charpente.document.v1",
      JSON.stringify({ client: { nom: "", adresse: "", codePostal: "", ville: "" }, numeroDevis: "", validiteJours: "x" }),
    );
    expect(chargerDocument(s)).toBeNull();
  });
});
