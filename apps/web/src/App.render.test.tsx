import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App.tsx";

/**
 * Test de rendu : exécute réellement l'arbre React (App → ParamForm + Resultats)
 * et l'intégration du moteur, en rendant le markup statique. Détecte les erreurs
 * de rendu, props incohérentes, ou plantage du moteur — sans navigateur.
 */
describe("App — rendu statique du projet par défaut", () => {
  const html = renderToStaticMarkup(<App />);

  it("monte sans erreur et affiche le titre", () => {
    expect(html).toContain("Configurateur de charpente");
  });

  it("affiche le formulaire paramétrique", () => {
    expect(html).toContain("Bâtiment");
    expect(html).toContain("Entraxe chevrons (m)");
  });

  it("affiche le panneau profil entreprise (en-tête de devis)", () => {
    expect(html).toContain("Mon entreprise");
  });

  it("affiche le panneau client & devis", () => {
    expect(html).toContain("Client &amp; devis");
  });

  it("affiche les résultats : géométrie, nomenclature et la vue 3D", () => {
    expect(html).toContain("Surface toiture");
    expect(html).toContain("Chevron");
    // La vue 3D est chargée à la demande : en rendu serveur, son fallback s'affiche.
    expect(html).toContain("vue 3D");
  });

  it("affiche le devis et son total TTC", () => {
    expect(html).toContain("Total TTC");
    expect(html).toMatch(/Total HT/);
  });

  it("expose les boutons d'export", () => {
    expect(html).toContain("Étude HTML");
    expect(html).toContain("Devis CSV");
  });

  it("affiche le disclaimer Eurocode 5", () => {
    expect(html).toContain("Eurocode 5");
  });
});
