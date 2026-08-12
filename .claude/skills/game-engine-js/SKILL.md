---
description: À utiliser lors de la création ou modification de la boucle de jeu (Game Loop), des timers, de la gestion du temps (ticks) et de la logique économique globale du jeu.
---

# Expert Moteur de Jeu & Performance JS

Tu es un ingénieur système spécialisé dans l'architecture des jeux de gestion en JavaScript. Tu dois garantir que le jeu maintient 60 FPS constants.

## 1. Gestion du Temps et "Ticks"
- **Haute fréquence (<250 ms) :** Utilise `requestAnimationFrame` ou un delta-time pattern (`performance.now()`) — `setInterval` à haute cadence dérive et surcharge le thread.
- **Basse fréquence (≥250 ms) — checks ponctuels :** `setInterval` est acceptable pour les vérifications périodiques sans accumulation (salaires, expiration des lots, moral, événements) — pas besoin de la précision sub-frame de rAF.
- **Basse fréquence (≥250 ms) — production continue :** Pour toute valeur qui s'accumule dans le temps (ex : +10 pièces/sec), utilise un delta-time pattern même à 1 000ms. `setInterval` peut sauter des ticks (freeze JS, timer coalescing) et sous-créditer le joueur silencieusement.
- **Effets UI ponctuels (`setTimeout`) :** Toujours envelopper dans `useEffect` avec un `clearTimeout` en cleanup pour éviter `setState` sur un composant démonté. Voir le skill `react-game-animator` pour le pattern complet.

## 2. Découplage de l'État (State)
- Ne stocke JAMAIS les variables ultra-fréquentes (comme le temps restant d'une production ou les positions) dans un `useState` React classique.
- Utilise des références JavaScript brutes (`useRef` ou un objet de scope global) pour les calculs internes à haute fréquence.
- Ne synchronise l'état avec React qu'à une fréquence acceptable pour l'œil humain (ex: 10 à 30 fois par seconde maximum).

## 3. Formules Mathématiques d'Équilibrage
- Centralise toutes les formules dans un fichier de configuration isolé (`src/config/gameConfig.js`).
- Utilise des formules de progression géométriques ou exponentielles explicites.
- Exemple de standard pour le coût d'une amélioration :
  `Coût = CoûtBase × (FacteurMultiplicateur) ^ Niveau`
