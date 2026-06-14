import { useMemo, useState } from "react";
import {
  projetParDefaut,
  etudier,
  ErreurValidation,
  type ParametresProjet,
  type Alerte,
} from "@charpente/moteur";
import { ParamForm } from "./components/ParamForm.tsx";
import { Resultats } from "./components/Resultats.tsx";

type Resultat =
  | { ok: true; etude: ReturnType<typeof etudier> }
  | { ok: false; erreurs: Alerte[] };

export default function App() {
  const [projet, setProjet] = useState<ParametresProjet>(() => projetParDefaut());

  // Le moteur est synchrone et bon marché : on recalcule à chaque changement.
  const resultat = useMemo<Resultat>(() => {
    try {
      return { ok: true, etude: etudier(projet) };
    } catch (e) {
      if (e instanceof ErreurValidation) return { ok: false, erreurs: e.alertes };
      throw e;
    }
  }, [projet]);

  return (
    <div className="app">
      <header className="entete">
        <h1>Configurateur de charpente</h1>
        <p className="sous-titre">
          Toiture 2 pans · charpente traditionnelle à pannes — géométrie, nomenclature,
          débit et devis en direct.
        </p>
      </header>

      <main className="layout">
        <section className="colonne-form" aria-label="Paramètres">
          <ParamForm projet={projet} onChange={setProjet} />
        </section>

        <section className="colonne-resultats" aria-label="Résultats">
          {resultat.ok ? (
            <Resultats etude={resultat.etude} />
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
