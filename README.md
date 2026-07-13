# Theseus

> Voir le pipeline avant de le construire.

Theseus est un atelier visuel de pipelines de données : on conçoit le pipeline en glisser-déposer, on prévisualise les données à chaque étape, on vérifie sa conformité, et on exporte des livrables prêts pour la production — code exécutable comme documentation de mission.

## Fonctionnalités

- **Canvas visuel** : sources → transformations → destinations, groupes, versions, templates, architecte IA (décrire un besoin → scaffold de pipeline).
- **Catalogue de transformations** : opérations classiques (filter, join, aggregate…), nettoyage/qualité, et 16 patterns SQL paramétrables (déduplication, SCD Type 2, chargement incrémental, masquage PII…).
- **Audit de conformité en continu** : score A–E affiché en permanence, pondéré sur 5 dimensions (complétude 50 %, cohérence, qualité, maintenabilité, sécurité/PII 12,5 % chacune).
- **Livrables** (hub unique) :
  - *Documents* — spec fonctionnelle Markdown (IA), spec data product YAML ODPS/DPDS/BITOL (IA), classeur de mission Foundry `.xlsx` (9 onglets, pré-rempli depuis le canvas).
  - *Code* — transform PySpark/Foundry, projet dbt (sources, modèles, schema.yml), ontologie JSON, config pipeline.

## Stack

Next.js 15 (App Router) · React 18 · Tailwind + Radix/shadcn · Firebase (Auth + Firestore) · OpenRouter pour les fonctions IA · exceljs pour l'export mission.

## Démarrer

```bash
npm install
cp .env.local.example .env.local   # ou renseigner OPENROUTER_API_KEY directement
npm run dev                        # http://localhost:9002
```

| Variable | Requis | Rôle |
|---|---|---|
| `OPENROUTER_API_KEY` | Pour les fonctions IA | Spec fonctionnelle, spec data product, architecte |

Les routes IA exigent un utilisateur Firebase connecté (le mode démo n'y a pas accès).

## Scripts

```bash
npm run dev        # serveur de dev (port 9002)
npm run build      # build de prod (typescript + lint bloquants)
npm run typecheck  # tsc --noEmit
npm test           # vitest — générateurs (PySpark, dbt), audit, descriptions d'opérations
```
