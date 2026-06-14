# charpente-mvp

Moteur paramétrique de charpente — **cœur déterministe** d'un futur logiciel métier
pour charpentiers / couvreurs. Transforme quelques paramètres en :
**géométrie → nomenclature → débit optimisé → devis**, avec traçabilité complète.

> Étape **Prototype** de la roadmap. Bibliothèque TypeScript pure, sans UI ni base
> de données : tout est vérifiable par les tests. L'UI (configurateur web/mobile)
> viendra *après* que le moteur soit prouvé juste.

## Périmètre (volontairement borné)

| Supporté (MVP) | Hors périmètre (versions suivantes) |
|---|---|
| Toiture **deux pans symétriques** | Croupes, arêtiers, noues, lucarnes, mansart |
| Charpente **traditionnelle à pannes** | Fermettes industrielles, ossature bois, CLT |
| Métré géométrique exact | Modeleur solide 3D, coupes composées (dévers) |
| Débit barres + liteaunage au ml | Pilotage machine (export BTLx) |
| **Vérif. flèche ELS indicative** | Note de calcul Eurocode 5 complète (ELU, assemblages) |

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
- Géométrie limitée aux **deux pans** : dès qu'il y a croupe/noue/lucarne, il faudra
  un vrai noyau solide 3D (verrou technique majeur, cf. analyse produit).
- Le poids propre du bois est négligé dans la charge (conservateur, documenté).

## Utilisation

Prérequis : **Node ≥ 22.18** (le moteur tourne en TypeScript natif, sans build).

```bash
pnpm install
pnpm test          # 57 tests : valeurs exactes + invariants + exports
pnpm type-check    # TypeScript strict (tsc --noEmit)
pnpm demo          # rapport texte sur le projet de référence (10 × 8 m, pente 45°)
pnpm export        # écrit les livrables dans out/ (HTML imprimable + 3 CSV)
```

Les livrables (`out/`) : `etude.html` (devis + nomenclature + débit + **schéma de coupe SVG**,
imprimable en PDF depuis le navigateur), `nomenclature.csv`, `debit.csv`, `devis.csv`
(séparateur `;`, décimales virgule, BOM UTF-8 → Excel/LibreOffice FR).

> **Stack volontairement minimale** : aucune dépendance runtime, aucun bundler.
> Node 24 exécute les `.ts` directement (strip de types) et le runner de tests est
> `node:test` intégré. La seule dépendance de dev est `typescript` (pour `type-check`).
> Conséquence pratique : `strip-only` interdit les transformations TS (paramètres-
> propriétés, enums, namespaces) — on s'en tient au sous-ensemble « types effaçables ».

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

- `src/domain/` — modèle de données (`types.ts`) + projet de référence (`defaults.ts`)
- `src/engine/` — géométrie, structure, nomenclature, débit, devis, orchestrateur
- `src/export/` — livrables purs (CSV, schéma de coupe SVG, HTML imprimable)
- `src/cli.ts` — démo (rapport texte) · `src/export-cli.ts` — génération des livrables
- `test/` — suite `node:test`

## Prochaines étapes (roadmap)

1. ~~**Export** (HTML imprimable + CSV + schéma de coupe SVG)~~ ✅ fait.
2. **UI configurateur** (web + mobile) au-dessus de ce moteur — saisie en ~3 min.
3. **Typologies** : appentis, puis croupe (introduit le besoin de solide 3D).
4. **Interop** : export BTLx (pilotage machine atelier).
5. **IA d'assistance** : relevé (photogrammétrie / orthophoto IGN), lecture de plan PDF.
