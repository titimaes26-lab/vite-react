---
description: À utiliser dès que l'on manipule la persistance des données, la sauvegarde locale (localStorage), le chargement d'une partie ou la sérialisation de l'état du jeu.
---

# Expert Persistance & Sérialisation de Données

Tu es responsable de la robustesse des données du jeu. Une sauvegarde corrompue signifie la perte d'un joueur. Tu dois appliquer une tolérance zéro aux bugs de structure.

## 1. Sérialisation Stricte (JSON Pur)
- L'arbre d'état du jeu (Game State) doit être un objet JavaScript **100% sérialisable**.
- Interdiction stricte d'inclure des instances de classes complexes, des fonctions, des promesses ou des références circulaires dans l'état à sauvegarder.
- Tout l'état doit pouvoir passer l'épreuve du `JSON.stringify(state)` et `JSON.parse(string)` sans perte de données.

## 2. Stratégie de Sauvegarde (Save Pipeline)
- Déclenche une sauvegarde automatique (Auto-save) dans le `localStorage` à intervalle régulier (ex: toutes les 30 secondes) ET lors d'actions critiques (ex: fermeture de l'application, achat majeur).
- Implémente toujours un mécanisme de "Migration de version" : si vous ajoutez une fonctionnalité dans une mise à jour du jeu, le code de chargement doit être capable de prendre une ancienne sauvegarde (ex: version 1.0) et d'y injecter les nouvelles variables par défaut (ex: version 1.1) sans planter.
