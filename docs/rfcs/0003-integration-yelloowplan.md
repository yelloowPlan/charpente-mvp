# RFC 0003 — Intégration du module Charpente dans YelloowPlan (option payante)

- **Statut** : proposé (préparation — **aucune modification du repo production**)
- **Date** : 2026-06-17
- **Périmètre** : plan d'intégration + packaging. L'exécution dans `C:\dev\yelloowplan` est **gated par décision explicite** (repo en production).
- **Pré-requis lus (lecture seule)** : `packages/billing/{addons,entitlements,plans}.ts`, `packages/verticals/src/{types,registry,navigation}.ts`, `apps/web/src/app/[slug]/*`.

---

## 1. Objectif

Vendre le configurateur de charpente comme **option payante** activable par les tenants YelloowPlan des métiers du bâtiment (charpentiers, couvreurs, constructeurs bois, BE). Réutiliser **le moteur tel quel** (zéro dépendance runtime, déterministe, 272 tests) ; ne créer côté YelloowPlan que la coquille (UI re-skinnée, persistance tenant, gating).

Tarif cible (reco antérieure) : **89 €/mois** en add-on (lancement 49–69 €).

## 2. Le mécanisme existe déjà — on s'y branche

YelloowPlan a **exactement** les rails nécessaires (rien à inventer) :

| Brique YelloowPlan | Rôle | Ce qu'on ajoute |
|---|---|---|
| `ModuleId` (`packages/verticals/src/types.ts`) | énumère les modules optionnels | `'charpente'` |
| `ADDONS` (`packages/billing/src/addons.ts`) | option payante → `feature_flags.enabled` via webhook Stripe | 1 entrée `key:'charpente'`, `moduleKey:'charpente'` |
| `VerticalPack.modulesEnabled` | modules proposés par métier | proposer `charpente` sur **`btp`** (métier-hôte : vocab chantier/compagnon/maître d'ouvrage) **+ `multiservices`** ; V2 = pack dédié `charpente` |
| `getEntitlements` / `feature_flags` | résout l'accès module | inchangé — l'add-on payé débloque `charpente` |
| `apps/web/src/app/[slug]/<module>/` | 1 dossier = 1 module gated | nouveau dossier `[slug]/charpente/` |

> Le modèle add-on (`addons.ts`) est littéralement documenté : « Pour ajouter une option payante : 1 entrée ici + 1 Stripe Price + 1 env var. » On suit ça.

## 3. Packaging du moteur

Le moteur est `@charpente/moteur` — **TS pur, `exports: "./src/index.ts"`, aucune dépendance runtime** (que des devDeps TS). Déjà consommé en `workspace:*` par l'app Vite (preuve que le TS brut se bundle).

**Option retenue : workspace package vendored.** Copier `packages/moteur` → `yelloowplan/packages/charpente-moteur` (ou git subtree pour garder l'historique et les MAJ). Aucune dépendance à installer.

Contraintes d'intégration Next.js :
- `next.config` : `transpilePackages: ['@yelloowplan/charpente-moteur']` (le package exporte du `.ts` brut).
- Imports relatifs avec extension `.ts` : OK avec le bundler Next (webpack/turbopack résolvent l'extension explicite ; déjà validé sous Vite).
- Le moteur est **isomorphe et sans I/O** → utilisable en RSC, route handler ou client. Les exports lourds (PDF jsPDF, 3D three.js) restent **client-only** (dynamic import), comme aujourd'hui.

Alternative (si vendoring refusé) : publier `@yelloowplan/charpente-moteur` sur le registre privé. Surcoût : pipeline de publication. Le vendoring est plus simple pour un module mono-conso.

## 4. Persistance (remplace le localStorage)

Aujourd'hui les projets vivent en `localStorage`. Côté YelloowPlan → table tenant-scoped, **RLS + filtre `eq(tenantId)` explicite** (skill `multitenant-security`, discipline `db-migrations`).

```sql
-- packages/db : nouvelle table métier
create table charpente_projets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  -- le ParametresProjet sérialisé (le moteur reste seule source de calcul)
  params jsonb not null,
  client_id uuid references clients(id) on delete set null, -- lien CRM existant
  created_by uuid references tenant_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on charpente_projets (tenant_id, updated_at desc);
-- + RLS policy tenant_isolation (manual SQL idempotent, comme le reste)
```

- `params jsonb` = le `ParametresProjet` du moteur (le calcul reste 100 % déterministe côté moteur ; la DB ne stocke que l'entrée). Versionner un `schemaVersion` dans le JSON pour les migrations futures.
- Lien **`client_id`** vers le CRM YelloowPlan → un devis charpente rattaché à une fiche client existante (synergie produit forte).
- Server actions de CRUD : filtre `tenantId` obligatoire + RBAC (rôles `owner/admin/manager`), audit_logs sur create/delete.

## 5. UI dans la console tenant

`apps/web/src/app/[slug]/charpente/` :
- `page.tsx` (RSC) : liste des projets charpente du tenant (loader `safeQuery`, filtre tenant).
- `[projetId]/page.tsx` : le configurateur. **Réutilise les composants moteur** (`Resultats`, `ParamForm`, `Vue3D`, exports) **re-skinnés** avec les design tokens YelloowPlan (skill `design-tokens` — pas de couleurs en dur ; remplacer la palette brune du POC par les tokens).
- Gating : `hasModule(entitlements, 'charpente')` → sinon `limit-reached-dialog` / page `locked` (déjà existants).
- Navigation : entrée conditionnée par le module (système `navigation.ts`), vocabulaire métier via le pack.
- Le **devis charpente** peut alimenter la finance YelloowPlan (revenu prévisionnel) — à cadrer (skill `revenue-ca`) ; en V1, export PDF/HTML autonome suffit.

## 6. Billing — l'entrée add-on

Dans `packages/billing/src/addons.ts` :

```ts
{
  key: 'charpente',
  name: 'Configurateur de charpente',
  description:
    'Géométrie, métré, débit optimisé et devis de charpente en direct (2 pans, croupe, '
    + 'extensions, lucarnes). Plans cotés + export DXF.',
  moduleKey: 'charpente',
  priceCents: 8900, // 89 €/mois
  stripePriceEnvVar: 'STRIPE_PRICE_ADDON_CHARPENTE',
  // Métier-hôte : btp (charpentiers/couvreurs/constructeurs bois y sont déjà tenants).
  // multiservices = touche-à-tout du bâtiment. PAS plomberie/électricité (ne posent pas de charpente).
  applicableVerticals: ['btp', 'multiservices'],
}
```

### Métier-hôte vs pack dédié (décision de positionnement)

- **V1 — add-on sur `btp`** (retenu) : zéro nouveau pack, les entreprises de charpente sont déjà des tenants `btp` (vocabulaire chantier/compagnon/maître d'ouvrage adapté). Opt-in : seuls ceux qui font de la charpente paient. **Time-to-market minimal.**
- **V2 — pack dédié `charpente`** (si traction) : nouveau `VerticalPack` « Charpente / Couverture / Bois » avec vocabulaire propre (ouvrage, métré, débit…), KPIs métier et le configurateur en **feature phare** → positionnement marketing net « YelloowPlan pour charpentiers ». Coût : 1 pack + page vitrine `/metiers/charpente`. À décider après les premiers usages.

+ `ModuleId |= 'charpente'`, + un Stripe Price récurrent, + l'env var. Le webhook `checkout.session.completed (kind=addon)` écrit déjà le `feature_flags` row → débloque le module. **Rien d'autre à câbler côté facturation.**

## 7. Sécurité multi-tenant (bloquant)

Tout code DB du module doit passer `pnpm audit:security` (skill `multitenant-security`) :
- `tenant_id NOT NULL` + RLS sur `charpente_projets` ;
- filtre `eq(tenantId)` explicite sur **chaque** requête Drizzle (loader RSC + server actions) ;
- RBAC sur les mutations ; anti-IDOR (vérifier que `projetId` appartient au tenant) ;
- audit_logs append-only sur create/update/delete ;
- tests E2E d'isolation cross-tenant (bloquants).

Le moteur lui-même est **pur** (aucune I/O, aucun tenant) → surface d'attaque nulle ; tout le risque est dans la coquille (persistance/actions), couvert ci-dessus.

## 8. Plan de déploiement (phasé, réversible)

1. **P0 — packaging** (ce repo) : figer l'API publique du moteur, doc `CONSUMERS.md`, vérifier zéro dépendance runtime. *(fait dans cette RFC)*
2. **P1 — vendoring** : `charpente-moteur` dans le monorepo YelloowPlan, `transpilePackages`, un test smoke d'import. Aucun impact utilisateur (pas de route).
3. **P2 — module derrière flag** : route `[slug]/charpente` + table + actions (RLS + audit), **gated `charpente`**, activable manuellement pour un tenant pilote (compte « comp »). Pas encore en vente.
4. **P3 — add-on payant** : entrée `ADDONS`, Stripe Price, page billing. GA.
5. **P4 — synergies** : lien CRM (client_id), devis → finance, vocabulaire métier.

Chaque phase est isolée et réversible ; P1–P2 n'exposent rien aux clients.

## 9. Ce qui est réutilisé vs nouveau

- **Réutilisé tel quel (zéro changement)** : tout `@charpente/moteur` (géométrie, nomenclature, débit, devis, exports CSV/DXF/HTML, 3D data, multi-volumes, lucarnes). 272 tests.
- **Re-skin** : composants UI (tokens YelloowPlan).
- **Nouveau** : table + RLS, server actions CRUD, route gated, entrée billing, env Stripe.

## 10. Risques & garde-fous

- **Ne pas déstabiliser la prod** : intégration en phases isolées, derrière flag, branche dédiée, 1 PR = 1 phase (< 500 lignes), RFC d'abord. **Aucune écriture prod sans feu vert.**
- **Bundler** : valider l'import TS brut sous Next très tôt (P1 smoke) ; fallback = pré-compiler le moteur en `dist/`.
- **Responsabilité** : conserver les disclaimers « indicatif, pas une note EC5 » dans l'UI re-skinnée.
- **Périmètre vente** : add-on sur métiers bâtiment uniquement (`applicableVerticals`).

---

### Prochain pas concret, sûr et autonome
P0 (packaging) : `CONSUMERS.md` dans le repo charpente + vérification que l'API publique est complète et stable. L'exécution P1+ attend ton feu vert (elle touche le repo production).
