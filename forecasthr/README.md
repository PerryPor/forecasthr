# ForecastHR

Outil de forecast F&B dédié à la restauration hôtelière.

## Déploiement sur Vercel (10 minutes)

### Étape 1 — Mettre le projet sur GitHub

1. Va sur **github.com** → clique **"New repository"**
2. Nom : `forecasthr`
3. Laisse tout par défaut → clique **"Create repository"**
4. Sur la page suivante, clique **"uploading an existing file"**
5. Glisse-dépose **tout le dossier** `forecasthr`
6. Clique **"Commit changes"**

### Étape 2 — Déployer sur Vercel

1. Va sur **vercel.com** → clique **"Add New Project"**
2. Clique **"Import"** à côté de `forecasthr`
3. Ne change rien → clique **"Deploy"**
4. Attends 2 minutes ✅

Ton app est en ligne à une URL du type : `forecasthr.vercel.app`

## Stack technique
- Next.js 14
- TypeScript
- React 18
- Hébergement : Vercel (gratuit)

## Structure
```
src/
  app/
    layout.tsx    → structure HTML de base
    page.tsx      → point d'entrée
    globals.css   → styles globaux
  components/
    ForecastHR.tsx → application principale
```
