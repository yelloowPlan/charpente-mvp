# RFC 0001 — Toitures composées multi-volumes (noues)

- **Statut** : **Lot A implémenté** (L + T réguliers, bout en bout) — Lots B/C à venir
- **Date** : 2026-06-17
- **Périmètre** : moteur (`packages/moteur`) + app (`apps/web`)
- **Pré-requis lus** : `geometrie.ts`, `nomenclature.ts` (`genererCroupe`), `ossature.ts`, `plan-geometry.ts`, `domain/types.ts`

---

## 1. Problème & enjeu métier

Aujourd'hui le moteur ne sait traiter qu'**un seul volume rectangulaire** : `deux_pans`, `appentis`, `croupe`. Or la majorité des chantiers résidentiels réels ne sont **pas** des rectangles simples : maison **en L** (extension, garage perpendiculaire), **en T** (aile centrale), corps de bâtiment + appentis raccordé… Dès qu'un deuxième volume vient se greffer, apparaît l'élément géométrique qui manque totalement au moteur : la **noue**.

> **La noue est l'angle rentrant** où deux versants descendent l'un vers l'autre (l'inverse d'un arêtier, qui est un angle saillant). C'est la pièce qui concentre les eaux de deux pans, et c'est techniquement le point dur de la charpente composée : tracé, empannons de noue décroissants, coupe composée, concentration de charge.

**Valeur** : passer du « calcul de hangar rectangulaire » au « calcul de vraie maison » est le saut qui rend l'outil crédible pour un charpentier sur du résidentiel. C'est le différenciateur le plus fort restant — et le plus coûteux.

---

## 2. Le verrou géométrique : la noue

Pour deux volumes **de même largeur W et même pente α**, les deux faîtages sont à la **même hauteur** `h = (W/2)·tanα`. Par symétrie, la noue se projette **à 45° en plan** sur chaque faîtage (exactement comme un arêtier), et sa longueur vraie est :

```
longueurNoueM = (W/2)·√(2 + tan²α)
```

> C'est **la même formule que `longueurAretierM`** déjà calculée dans `geometrie.ts:73`. Une noue régulière est géométriquement l'image miroir d'un arêtier de croupe — d'où une réutilisation directe possible de tout l'acquis croupe.

Conséquences sur les pièces :

- **Chevron de noue** : 1 pièce par noue, longueur `longueurNoueM`, section renforcée (porte deux pans) — analogue arêtier, rôle `noue` (nouveau).
- **Empannons de noue** (valley jacks) : sur chaque versant adjacent, les chevrons communs sont recoupés et meurent dans la noue. Leurs longueurs **croissent** en s'éloignant de l'angle rentrant (miroir des empannons de croupe qui décroissent). Mêmes comptages que `genererCroupe`, par symétrie.
- **Surface** : inclusion-exclusion — `surface = Σ(surfaces des volumes pleins) − recouvrement`. La zone où le volume secondaire passe « sous » le pan principal n'est comptée qu'une fois.

Dès que les hypothèses régulières tombent, ça se complexifie (cf. §4) :

| Hypothèse rompue | Effet géométrique | Difficulté |
|---|---|---|
| Largeurs différentes (W₁ ≠ W₂) | Faîtages à **hauteurs différentes** → noue **non à 45°** + raccord (le volume bas bute sous le pan haut) | Élevée |
| Pentes différentes (α₁ ≠ α₂) | **Noue gauche** (dévers variable le long de la ligne) | Très élevée |
| Greffe ponctuelle (lucarne, chien-assis) | Pénétration locale d'un pan | Lot séparé |

---

## 3. Taxonomie des jonctions (par complexité croissante)

1. **L régulier** — 2 rectangles à angle droit, même W, même α → **1 noue**. *(Lot A)*
2. **T régulier** — aile perpendiculaire greffée au milieu d'un long pan, même W, même α → **2 noues** (une de chaque côté de l'aile). *(Lot A)*
3. **Croix (+)** régulière → **4 noues**. *(Lot B)*
4. **Largeurs différentes** (faîtages décalés, noue + pénétration). *(Lot B)*
5. **Pentes différentes / lucarnes / noues gauches.** *(hors périmètre proche)*

---

## 4. Modèle de données proposé (rétro-compatible)

**Principe directeur : ne PAS construire un moteur de composition de N volumes arbitraires** (détection géométrique libre des recouvrements = explosion combinatoire + risque de régression majeur). On déclare **un volume principal** (l'actuel `batiment`, inchangé) + **un volume secondaire optionnel** greffé selon un raccord nommé.

```ts
// domain/types.ts — AJOUT (tout optionnel)
export type TypeRaccord = "L" | "T";

export interface VolumeSecondaire {
  /** largeur (portée) du volume greffé — Lot A : doit égaler W principal */
  largeurM: number;
  /** longueur du volume greffé (saillie hors du corps principal) */
  longueurM: number;
  /** position du faîtage secondaire le long du faîtage principal (m, depuis le pignon gauche) */
  positionM: number;
  /** côté de greffe pour un L (gauche/droit du corps principal) */
  cote?: "gauche" | "droit";
}

export interface Composition {
  raccord: TypeRaccord;
  secondaire: VolumeSecondaire;
}

// ParametresProjet.toiture devient :
toiture: {
  typologie: TypeToiture;
  penteDeg: number;
  couverture: Couverture;
  composition?: Composition; // ABSENT = comportement mono-volume actuel (golden préservé)
}
```

**Rétro-compatibilité** : `composition` absent ⇒ on passe par exactement le chemin de code actuel. Le loader de persistance traite l'absence du champ comme aujourd'hui. **Le golden TTC mono-volume reste verrouillé par construction.**

---

## 5. Stratégie de calcul (réutilisation maximale)

Pipeline inchangé (`géométrie → nomenclature → débit → devis → 3D/2D`). Pour un projet composé, chaque étage **compose** au lieu de remplacer :

- **`geometrie.ts`** : `calculerGeometrieComposee(p)` = géométrie du principal (existante) + géométrie du secondaire (réutilise `calculerGeometrie` sur un sous-projet) + `longueurNoueM` + `nbNoues` (L→1, T→2) + surface par inclusion-exclusion.
- **`nomenclature.ts`** : générer la nomenclature du principal **puis** celle du secondaire via les générateurs existants, **soustraire** les chevrons communs supprimés par la noue, **ajouter** : chevron(s) de noue + empannons de noue (réemploi de la logique `genererCroupe`). Marquer `estimation: true` sur les zones de raccord (le champ existe déjà, cf. croupe).
- **`couverture.ts`** : ajouter `mlNoues` au métré (déjà : `mlAretiers`).
- **`ossature.ts`** : instancier l'ossature du secondaire avec une **transformation** (rotation 90° + translation `positionM`) et ajouter les poutres de noue. Le rôle `aretier` existe déjà en 3D ; ajouter `noue`.
- **`plan-geometry.ts` / `plan-svg.ts` / `dxf.ts`** : ajouter les segments du contour secondaire + segment(s) de noue (`TypeSegment` : ajouter `noue`, tracé pointillé comme l'arêtier). Repérage N1.. comme A1...
- **`structure.ts`** : flag « chevron de noue : reprend la charge de 2 pans, section à valider par un BE » (pas de dimensionnement fin).
- **`ParamForm.tsx`** : section « Volume secondaire » (raccord L/T, longueur, position) repliée par défaut.
- **`html.ts`** : le plan composé et le métré noues passent automatiquement (consomment la géométrie).

---

## 6. Découpage en lots

| Lot | Contenu | Complexité | Risque régression |
|---|---|---|---|
| **A** | L + T réguliers (W égales, α égales), noues exactes à 45°, empannons de noue, surface inclusion-exclusion, plan 2D + DXF + 3D + devis | **Moyenne-élevée** | **Faible** (chemin mono-volume isolé) |
| **B** | Croix (+), largeurs différentes (faîtages décalés, raccord/pénétration) | Élevée | Moyen |
| **C** | Pentes différentes, lucarnes/chiens-assis, noues gauches, calcul EC5 de noue | Très élevée | — |

---

## 7. Recommandation

**Attaquer le Lot A uniquement**, et seulement lui, pour ces raisons :

1. **Couvre le cas dominant** réel : maison + extension/garage perpendiculaire de même travée.
2. **Réutilise massivement l'existant** : `longueurNoueM = longueurAretierM` (symétrie), empannons = logique croupe déjà écrite et testée.
3. **Risque maîtrisé** : `composition` optionnel ⇒ mono-volume strictement inchangé ⇒ **golden 16 841,89 € préservé par construction**.
4. **Honnête sur les limites** : on assume `estimation: true` sur les zones de raccord (cohérent avec la croupe), pas de promesse de note EC5 sur la noue.

Lot B/C **après** retour terrain — ne pas spéculer sur des cas rares avant d'avoir validé le L/T avec de vrais charpentiers.

### Effort indicatif Lot A
~5 incréments livrables séparément (1 PR chacun, golden vérifié à chaque fois) :
A1 types + `calculerGeometrieComposee` (+ tests noue/surface) · A2 nomenclature composée (empannons noue) · A3 plan 2D/DXF + repérage noues · A4 ossature 3D composée · A5 UI éditeur volume secondaire + export HTML.

---

## 8. Critères d'acceptation (Lot A)

- `longueurNoueM` == `(W/2)·√(2+tan²α)` (test exact, tolérance 1e-9).
- Surface composée == Σ surfaces − recouvrement (test sur un L connu à la main).
- **Golden mono-volume inchangé** (TTC 16 841,89 €) — `composition` absent.
- L ⇒ 1 noue, T ⇒ 2 noues dans la nomenclature et le plan.
- Pas de **double comptage** de la zone de raccord dans le devis (surface, couverture, chevrons).
- Plan 2D et 3D affichent la/les noue(s) ; métré couverture expose `mlNoues`.
- `pnpm --filter @charpente/moteur test` + `@charpente/web` verts ; les deux builds OK.

---

## 8 bis. État de réalisation (Lot A)

| Incrément | Livré | Notes |
|---|---|---|
| A1 géométrie | ✅ | `calculerGeometrieComposee` : noue exacte `(W/2)·√(2+tan²α)`, surface T en forme close ; L marqué `surfaceExacte:false` |
| A2 nomenclature | ✅ | `genererNomenclatureComposee` : aile + chevron(s) de noue + empannons ; additif/conservateur, `estimation:true` |
| A3 plan 2D/DXF | ✅ | segments aile + noues, repères N1.., calque DXF `NOUE`, bbox auto |
| A4 3D | ✅ | `genererOssature/Lattage/CouvertureComposee3D`, rôle `noue` |
| A5 UI + câblage | ✅ | `etudier` branché (surface composée au devis), éditeur « Volume secondaire », preset « Maison en T », sous-titre dynamique |

Reste Lot A possible (non bloquant) : retrait fin des chevrons recoupés (passer d'estimé à exact), `mlNoues` dans le métré couverture, dérivation propre de la surface **L**.

## 9. Hors périmètre (explicite)

Faîtages à hauteurs différentes (W inégales) · pentes différentes · noues gauches · lucarnes/chiens-assis · dimensionnement EC5 du chevron de noue · reconnaissance géométrique automatique de volumes arbitraires (on reste sur une composition **déclarée**).
