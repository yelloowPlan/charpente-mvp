# Consommer `@charpente/moteur`

Moteur paramétrique de charpente : **TypeScript pur, isomorphe, sans dépendance runtime, sans I/O**. Tout le calcul est déterministe et synchrone. Conçu pour être réutilisé tel quel par un autre front (cf. RFC 0003 — intégration YelloowPlan).

## Installation / résolution

- **Monorepo pnpm** : déclarer `"@charpente/moteur": "workspace:*"` (vendoring) — déjà fait par `apps/web`.
- **Le package exporte du TS brut** (`exports: "./src/index.ts"`). Le consommateur doit donc le transpiler :
  - **Vite** : fonctionne sans config (validé par `apps/web`).
  - **Next.js** : `transpilePackages: ['@charpente/moteur']` dans `next.config`.
  - Les imports relatifs internes portent l'extension `.ts` (mode strip Node) — résolus par Vite / webpack / turbopack.
- Aucune dépendance runtime à installer (que des devDeps TypeScript).

## Frontière client / serveur

Le moteur est **utilisable partout** (RSC, route handler, client) car pur et sans I/O. Seuls les **livrables lourds** doivent rester *client-only* (dynamic import) :

- `three.js` n'est PAS dans le moteur — les fonctions 3D (`genererOssature3D`, …) renvoient des **données pures** (`Poutre3D`, `Pan3D`) ; le rendu three est côté app.
- Le PDF (jsPDF) est côté app également.
- HTML / SVG / DXF / CSV sont de simples **strings** → générables côté serveur sans souci.

## API publique (point d'entrée `index.ts`)

### Entrée & pipeline
- `projetParDefaut(override?)` → `ParametresProjet` (toutes les entrées, avec valeurs par défaut).
- `etudier(p)` → `Etude` (pipeline complet : validation → géométrie → nomenclature → débit → devis + alertes + note de calcul). **Lève `ErreurValidation`** si entrée invalide.
- `validerProjet(p)` → `Alerte[]` (sans lever ; pour un retour live non bloquant).

### Calculs unitaires (si besoin granulaire)
- Géométrie : `calculerGeometrie`, `calculerGeometrieComposee` (multi-volumes).
- Nomenclature : `genererNomenclature`, `genererNomenclatureComposee`.
- Structure (indicatif) : `chargeElsKNm2`, `porteeAdmissibleFlecheM`, `chargeNeigeSolKNm2`, `fmdMPa`, `contrainteFlexionMPa`.
- Métré : `metreCouverture`, `metreLucarnes`.
- Débit (optimisation barres) : `planifierDebit`.
- Devis : `chiffrerDevis`, `appliquerRemise`, `ligneLibre`.

### Données de visualisation (pures, sans three.js)
- Ossature/lattage/couverture : `generer{Ossature,Lattage,Couverture}3D` (+ variantes `*Composee3D`), `genererLucarnes3D`.
- Plan 2D : `segmentsPlan` (source partagée SVG/DXF).

### Livrables (strings)
- `etudeVersHtml(etude, options)` — devis/étude HTML imprimable.
- `planMasseSvg`, `coupeTransversaleSvg` — plans SVG.
- `planDxf` — export DXF (CAO).
- `nomenclatureVersCsv`, `debitVersCsv`, `devisVersCsv`, `planDeCoupeVersCsv`.

## Persistance

Le moteur ne persiste rien. Sérialiser **uniquement le `ParametresProjet`** (l'entrée) — tout le reste se recalcule. Stocker un `schemaVersion` à côté pour les migrations futures.

## Invariants & responsabilité

- **Argent en centimes entiers** (jamais de flottant). Golden de référence verrouillé par test : TTC 16 841,89 € sur le projet par défaut.
- Vérifications structurelles **INDICATIVES** (flèche ELS + flexion ELU simplifiées) — **ne remplacent pas une note Eurocode 5**. Conserver ces disclaimers dans toute UI.
- Toute géométrie « estimée » est signalée (`ResultatNomenclature.estimation`, alertes) — à refléter dans l'UI.

## Stabilité

API surface = exports de `src/index.ts`. Tout changement cassant → bump de version + note ici.
