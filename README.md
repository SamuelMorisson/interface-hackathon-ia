# TechCorp AI — Financial Assistant

Interface web de chat connectée au modèle **Phi-3.5-Financial** via Ollama.

## Choix technique — Ollama vs Triton

Dans le cadre de ce projet, nous avions le choix entre trois solutions pour servir le modèle Phi-3.5-Financial : **Ollama**, **Triton Inference Server** ou un serveur maison (FastAPI, vLLM…).

Nous avons retenu **Ollama** comme serveur principal pour les raisons suivantes :

- **Mise en place immédiate** : une seule commande suffit à télécharger et lancer le modèle, sans configuration Docker ni dépendances NVIDIA complexes
- **API REST native** : Ollama expose directement une API compatible avec notre stack Node.js + React, sans couche d'adaptation
- **Streaming intégré** : les réponses arrivent token par token sans configuration supplémentaire, ce qui améliore l'expérience utilisateur
- **Modèle personnalisé simplifié** : le système de `Modelfile` permet de surcharger le system prompt et les paramètres d'inférence en quelques lignes
- **Légèreté** : fonctionne en CPU ou GPU sans prérequis matériels stricts, contrairement à Triton qui nécessite un GPU NVIDIA et une stack Docker lourde

Triton Inference Server reste disponible dans le dossier `triton/` pour un déploiement avancé en production avec GPU dédié. L'interface supporte les deux backends via le sélecteur intégré.

## Stack technique

- **Frontend** : React 18 + Vite
- **Backend** : Node.js + Express
- **Modèle** : `techcorp-finance:latest` (Phi-3.5 fine-tuné finance)
- **Serveur d'inférence** : Ollama

## Architecture

```
Navigateur (React :5173)
    └── /api/chat
Node.js (Express :3001)
    └── http://localhost:11434/api/chat
Ollama
    └── techcorp-finance:latest
```

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com/download) installé et le modèle `techcorp-finance:latest` chargé

## Installation

```bash
# Cloner le repo
git clone https://github.com/SamuelMorisson/interface-hackathon-ia.git
cd interface-hackathon-ia

# Installer les dépendances backend
npm install

# Installer les dépendances frontend
cd client
npm install
cd ..
```

## Lancement

Ouvrir **deux terminaux** à la racine du projet :

**Terminal 1 — Backend Node.js :**
```bash
node server.js
# → http://localhost:3001
```

**Terminal 2 — Frontend React :**
```bash
cd client
npm run dev
# → http://localhost:5173
```

Ouvrir **http://localhost:5173** dans le navigateur.

## Fonctionnalités

- Chat en temps réel avec streaming des réponses
- Historique de conversation multi-turn
- Suggestions de questions au démarrage
- Interface responsive dark mode

## Build production

```bash
npm run build
node server.js
# → http://localhost:3001
```
