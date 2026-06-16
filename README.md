# charpente-mvp

Logiciel métier de charpente — **monorepo** : un moteur paramétrique déterministe
et un configurateur web par-dessus. Transforme quelques paramètres en :
**géométrie → nomenclature → débit optimisé → devis**, avec traçabilité complète
et livrables (HTML imprimable + CSV).

```
packages/moteur   @charpente/moteur  — cœur TypeScript pur (zéro dépendance runtime)
apps/web          @charpente/web     — configurateur Vite + React (le moteur tourne dans le navigateur)
```

> Le moteur est **framework-agnostique** : il est consommé par l'app web aujourd'hui,
> et portable vers Next.js / mobile plus tard sans réécriture. L'UI ne fait que piloter
> le moteur et afficher ses résultats — toute la logique métier vit dans `packages/moteur`.

## Périmètre (volontairement borné)

| Supporté (MVP) | Hors périmètre (versions suivantes) |
|---|---|
| Toiture **deux pans**, **appentis**, **croupe** (calculée, pente égale) | Noues, lucarnes, mansart, hip irrégulier |
| **Visualisation 3D** interactive (live) | — |
| Charpente **traditionnelle à pannes** | Fermettes industrielles, ossature bois, CLT |
| Métré géométrique exact | Modeleur solide 3D, coupes composées (dévers) |
| Débit barres + liteaunage au ml | Pilotage machine (export BTLx) |
| **Vérif. flèche ELS indicative** | Note de calcul Eurocode 5 complète (ELU, assemblages) |
| **Devis pro** (en-tête entreprise, client, n°, validité) | Acomptes, échéancier, signature électronique |
| **Sauvegarde locale** des projets (navigateur) | Comptes, cloud, multi-utilisateur |

### Fonctionnalités de l'app web
Configurateur live (toute saisie recalcule géométrie, nomenclature, débit, devis) ·
schéma de **coupe transversale** (2 pans / appentis) · **exports** HTML imprimable
(→ PDF) et CSV · **profil entreprise** + **bloc client / n° / validité** sur le devis ·
**sauvegarde locale** (projets nommés, auto-restauration) · **UX mobile** (onglets,
champs tactiles) · installable (« ajout à l'écran d'accueil »).

## Décisions de conception (les plus importantes)

1. **Cœur déterministe, IA hors du chemin structurel.** Aucune quantité qui engage
   une responsabilité ne dépend d'un modèle probabiliste. L'IA (relevé, lecture de
   plan) reste une couche d'assistance amont, toujours validée par l'humain.
2. **Le nombre de pannes intermédiaires est *calculé*, pas saisi.** On calcule la
   portée admissible du chevron (flèche ELS `L/300`) et on en déduit le nombre de
   pannes ventrières nécessaires. Honnête et actionnable, plutôt qu'un faux contrôle
   structurel sur le rampant entier. Voir `src/engine/structure.ts`.
3. **Deux modes de débit.** Pièces rigides (`barre`, packing FFD + trait de scie) vs
   linéaire avec aboutage (`lineaire`, liteaux). Les pièces plus longues que la barre
   max sont signalées (aboutage / commande sur mesure) et comptées au coût réel.
4. **Argent en centimes entiers.** Jamais de flottant sur les montants.
5. **Traçabilité.** Chaque élément porte sa `formule` : l'utilisateur voit d'où vient
   chaque quantité.

## Limites assumées (honnêteté technique)

- La vérification structurelle ne couvre **que la flèche (ELS)** — pas l'ELU, le
  flambement, le déversement ni les assemblages. **Ne remplace pas un bureau d'études.**
- **Croupe régulière** (pente égale) : chevrons communs, **empannons décroissants**
  calculés, arêtiers, faîtage raccourci (L−W) et sablières. Coupes composées (dévers
  d'arêtier) à tracer par le pro ; hip irrégulier (pentes différentes) hors périmètre.
- Noues, lucarnes, mansart : hors périmètre (verrou technique majeur, cf. analyse produit).
- Appentis : supports intermédiaires des pannes (poteaux/portiques) non calculés (alerte).
- Le poids propre du bois est négligé dans la charge (conservateur, documenté).

## Utilisation

Prérequis : **Node ≥ 22.18** (le moteur tourne en TypeScript natif, sans build).

```bash
pnpm install
pnpm test          # tous les packages : 198 tests moteur (dont matrice robustesse) + 22 tests web
pnpm type-check    # tous les packages (tsc --noEmit strict)
pnpm dev           # lance le configurateur web (Vite, http://localhost:5173)
pnpm build:web     # build de production de l'app web
pnpm demo          # moteur : rapport texte sur le projet de référence (10 × 8 m, pente 45°)
pnpm export        # moteur : écrit les livrables dans packages/moteur/out/ (HTML + 3 CSV)
```

Les livrables (`out/`) : `etude.html` (devis + nomenclature + débit + **schéma de coupe SVG**,
imprimable en PDF depuis le navigateur), `nomenclature.csv`, `debit.csv`, `devis.csv`
(séparateur `;`, décimales virgule, BOM UTF-8 → Excel/LibreOffice FR).

> **Moteur à stack minimale** : `@charpente/moteur` n'a **aucune dépendance runtime**.
> Node ≥ 22.18 exécute les `.ts` directement (strip de types) et le runner de tests est
> `node:test` intégré. Conséquence pratique : `strip-only` interdit les transformations TS
> (paramètres-propriétés, enums, namespaces) — on s'en tient au sous-ensemble « types
> effaçables ». L'app web ajoute Vite + React (esbuild autorisé via `pnpm-workspace.yaml`).

## Déploiement (app web)

L'app est une **SPA statique** (aucun backend) : le build `apps/web/dist` se publie
sur n'importe quel hébergeur statique. Les chemins d'assets sont relatifs (`base: "./"`),
donc ça marche à la racine d'un domaine comme dans un sous-dossier.

- **Netlify** : brancher le dépôt — `netlify.toml` (racine) fournit la commande de build
  et `publish = apps/web/dist`. Rien d'autre à configurer.
- **Vercel** : *Root Directory* = `apps/web`, *Build Command* = `pnpm build`,
  *Output Directory* = `dist` (preset Vite).
- **Manuel** : `pnpm build:web` puis déposer le contenu de `apps/web/dist/`.

> La publication effective (lier le dépôt à l'hébergeur) nécessite ton compte —
> c'est une action sortante à faire de ton côté. Le projet est prêt à l'emploi.

Un **manifest** (`manifest.webmanifest` + icône) permet l'« ajout à l'écran d'accueil »
sur mobile (affichage plein écran), sans service worker (pas de mode hors-ligne à ce stade).

## Architecture du moteur

```
ParametresProjet
   │  validerProjet()           ← règles bloquantes + alertes
   ▼
calculerGeometrie()             → rampant, hauteur, surface
   ▼
genererNomenclature()           → Element[] (+ portée admissible, pannes interm.)
   ▼
planifierDebit()                → barres optimisées par section (FFD / linéaire)
   ▼
chiffrerDevis()                 → lignes HT, TVA, TTC (centimes)
   ▲
etudier()  ── orchestre tout et agrège les alertes
```

Dans `packages/moteur/` :
- `src/domain/` — modèle de données (`types.ts`) + projet de référence (`defaults.ts`)
- `src/engine/` — géométrie, structure, nomenclature, débit, devis, orchestrateur
- `src/export/` — livrables purs (CSV, schéma de coupe SVG, HTML imprimable)
- `src/cli.ts` — démo (rapport texte) · `src/export-cli.ts` — génération des livrables
- `test/` — suite `node:test`

Dans `apps/web/` (Vite + React) :
- `src/App.tsx` — état (projet, entreprise, document) + recalcul live via `etudier()`
- `src/components/ParamForm.tsx` — formulaire paramétrique (dont typologie)
- `src/components/Resultats.tsx` — géométrie, coupe SVG, tables, devis, exports
- `src/components/{GestionProjets,EntrepriseForm,ClientDevisForm}.tsx` — sauvegarde & en-tête devis
- `src/lib/persistence.ts` — localStorage (fonctions pures, testées, SSR-safe)
- composants purement présentationnels (portables vers un autre framework)

## Prochaines étapes (roadmap)

Fait : ✅ moteur déterministe · ✅ exports (HTML/CSV/SVG) · ✅ configurateur web ·
✅ typologie appentis · ✅ devis pro (entreprise/client) · ✅ sauvegarde locale ·
✅ UX mobile · ✅ déploiement continu (Netlify).

À venir (V2 — décisions produit requises) :
1. **Typologies complexes** : croupe, lucarnes (introduit le besoin de solide 3D).
2. **Interop** : export BTLx (pilotage machine atelier).
3. **IA d'assistance** : relevé (photogrammétrie / orthophoto IGN), lecture de plan PDF.
4. **Comptes & cloud** : multi-utilisateur, partage, historique serveur.
