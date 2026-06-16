import { useEffect, useMemo, useState } from "react";
import {
  projetParDefaut,
  etudier,
  ErreurValidation,
  type ParametresProjet,
  type Entreprise,
  type Alerte,
} from "@charpente/moteur";
import { ParamForm } from "./components/ParamForm.tsx";
import { Resultats } from "./components/Resultats.tsx";
import { GestionProjets } from "./components/GestionProjets.tsx";
import { Presets } from "./components/Presets.tsx";
import type { Preset } from "./lib/presets.ts";
import { EntrepriseForm } from "./components/EntrepriseForm.tsx";
import { ClientDevisForm } from "./components/ClientDevisForm.tsx";
import { PostesAnnexes } from "./components/PostesAnnexes.tsx";
import {
  magasinNavigateur,
  chargerBrouillon,
  sauverBrouillon,
  listerProjets,
  enregistrerProjet,
  supprimerProjet,
  chargerEntreprise,
  sauverEntreprise,
  entrepriseVide,
  chargerDocument,
  sauverDocument,
  documentVide,
  type ProjetEnregistre,
  type DocumentDevis,
} from "./lib/persistence.ts";

type Resultat =
  | { ok: true; etude: ReturnType<typeof etudier> }
  | { ok: false; erreurs: Alerte[] };

type Onglet = "form" | "resultats";

export default function App() {
  const store = useMemo(() => magasinNavigateur(), []);

  // Restaure le projet de travail (brouillon) si présent, sinon projet par défaut.
  const [projet, setProjet] = useState<ParametresProjet>(
    () => chargerBrouillon(store) ?? projetParDefaut(),
  );
  const [projets, setProjets] = useState<ProjetEnregistre[]>(() => listerProjets(store));
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState<Entreprise>(
    () => chargerEntreprise(store) ?? entrepriseVide(),
  );
  const [doc, setDoc] = useState<DocumentDevis>(() => chargerDocument(store) ?? documentVide());
  const [onglet, setOnglet] = useState<Onglet>("form");

  // Auto-save du projet de travail (survit au rafraîchissement).
  useEffect(() => {
    sauverBrouillon(store, projet);
  }, [store, projet]);

  // Auto-save du profil entreprise.
  useEffect(() => {
    sauverEntreprise(store, entreprise);
  }, [store, entreprise]);

  // Auto-save du document de devis (client, n°, validité).
  useEffect(() => {
    sauverDocument(store, doc);
  }, [store, doc]);

  // Le moteur est synchrone et bon marché : on recalcule à chaque changement.
  const resultat = useMemo<Resultat>(() => {
    try {
      return { ok: true, etude: etudier(projet) };
    } catch (e) {
      if (e instanceof ErreurValidation) return { ok: false, erreurs: e.alertes };
      throw e;
    }
  }, [projet]);

  const handleSave = () => {
    const n = nom.trim() || "Sans titre";
    setProjets(enregistrerProjet(store, n, projet, new Date().toISOString()));
  };
  const handleLoad = (id: string) => {
    const p = projets.find((x) => x.id === id);
    if (p) {
      setProjet(p.projet);
      setNom(p.nom);
    }
  };
  const handleDelete = (id: string) => setProjets(supprimerProjet(store, id));
  const handlePreset = (preset: Preset) => {
    setProjet(preset.projet);
    setOnglet("resultats");
  };

  return (
    <div className="app">
      <header className="entete">
        <h1>Configurateur de charpente</h1>
        <p className="sous-titre">
          Toiture 2 pans · charpente traditionnelle à pannes — géométrie, nomenclature,
          débit et devis en direct.
        </p>
      </header>

      {/* Bascule visible uniquement sur mobile (CSS) */}
      <nav className="tabs-mobile" role="tablist" aria-label="Affichage">
        <button
          role="tab"
          aria-selected={onglet === "form"}
          className={onglet === "form" ? "actif" : ""}
          onClick={() => setOnglet("form")}
        >
          Paramètres
        </button>
        <button
          role="tab"
          aria-selected={onglet === "resultats"}
          className={onglet === "resultats" ? "actif" : ""}
          onClick={() => setOnglet("resultats")}
        >
          Résultats{resultat.ok ? "" : " ⚠"}
        </button>
      </nav>

      <main className="layout">
        <section
          className={`colonne-form${onglet === "form" ? " onglet-actif" : ""}`}
          aria-label="Paramètres"
        >
          <Presets onCharger={handlePreset} />
          <GestionProjets
            projets={projets}
            nom={nom}
            onNom={setNom}
            onSave={handleSave}
            onLoad={handleLoad}
            onDelete={handleDelete}
          />
          <ParamForm projet={projet} onChange={setProjet} />
          <EntrepriseForm entreprise={entreprise} onChange={setEntreprise} />
          <ClientDevisForm doc={doc} onChange={setDoc} />
          <PostesAnnexes doc={doc} onChange={setDoc} />
        </section>

        <section
          className={`colonne-resultats${onglet === "resultats" ? " onglet-actif" : ""}`}
          aria-label="Résultats"
        >
          {resultat.ok ? (
            <Resultats
              etude={resultat.etude}
              entreprise={entreprise}
              referenceChantier={nom.trim()}
              client={doc.client}
              numeroDevis={doc.numeroDevis}
              validiteJours={doc.validiteJours}
              remisePct={doc.remisePct}
              acomptePct={doc.acomptePct}
              lignesLibres={doc.lignesLibres}
              mentions={doc.mentions}
            />
          ) : (
            <div className="bloc erreurs" role="alert">
              <h2>Paramètres invalides</h2>
              <ul>
                {resultat.erreurs.map((a, i) => (
                  <li key={i}>{a.message}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <footer className="pied">
        Vérifications structurelles indicatives (flèche ELS) — ne remplacent pas une note
        de calcul Eurocode 5.
      </footer>
    </div>
  );
}
