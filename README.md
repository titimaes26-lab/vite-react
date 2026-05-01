# Mon Resto Manager — Guide développeur

Application React embarquée dans GDevelop via iframe. Simule la gestion complète d'un restaurant (salle, cuisine, stock, personnel, objectifs) avec un système de temps accéléré.

---

## Stack technique

| Élément | Version |
|---------|---------|
| React | 18.2 |
| Vite | 4.4 |
| JavaScript | ES Modules |
| i18n | Contexte React maison (fr / en) |
| Entrée HTML | `main.jsx` → `restaurant-manager.jsx` |

> **Point d'entrée** : `main.jsx` importe `restaurant-manager.jsx` (racine du repo), qui encapsule le `LangProvider`, les services de persistance/bridge, et monte `src/App.jsx`.

---

## Lancer le projet

```bash
npm install
npm run dev      # développement (localhost:5173)
npm run build    # production → dist/
```

---

## Architecture des fichiers

```
main.jsx                            ← Point d'entrée Vite (monte restaurant-manager.jsx)
restaurant-manager.jsx              ← Wrapper i18n + bridge GDevelop + montage App
src/
  App.jsx                           ← Orchestrateur principal (état global, layout, hooks)
  App.css / index.css

  constants/
    gameData.js                     ← Données statiques (niveaux, tables, menu, stock…)
    gameConstants.js                ← Règles de jeu (réputation, thèmes, formules)
    serverConstants.js              ← Spécialités, formations, moral serveurs
    serverData.js                   ← Pool de noms / données initiales serveurs
    helpContent.js                  ← Contenu du guide utilisateur in-game

  utils/
    levelUtils.js                   ← Calculs de niveaux + plafonds XP
    randomUtils.js                  ← Génération aléatoire (clients, noms, humeurs)
    orderUtils.js                   ← Commandes, tickets cuisine, calcul addition
    saveUtils.js                    ← Sauvegarde localStorage + sanitizeSave

  services/
    persistence.js                  ← loadGame / saveGame
    gdevelopBridge.js               ← sendToGDevelop + buildGDevelopPayload
    adBridge.js                     ← triggerAd (publicités récompensées)

  hooks/
    useGameClock.js                 ← Horloge de jeu (tick 250 ms) + phases + créneaux
    useSpawner.js                   ← Arrivée des clients (taux par phase)
    useExpiry.js                    ← Expiration file, fin nettoyage, libération serveurs
    useSalary.js                    ← Paiement des salaires (toutes les 60 s réelles)
    useDeliveries.js                ← Livraisons fournisseurs
    useEvents.js                    ← Événements aléatoires
    useServerMoral.js               ← Moral des serveurs (drain + récupération)
    useFreshness.js                 ← Fraîcheur des stocks
    useChallenges.js                ← Défis quotidiens
    useObjectives.js                ← Objectifs de progression
    useBreakpoint.js                ← Responsive (mobile / tablet / desktop)

  views/
    TablesView.jsx                  ← Salle (placement, service, encaissement, nettoyage)
    KitchenView.jsx                 ← Cuisine (cuisson, commis, pipeline)
    ServersView.jsx                 ← Personnel : brigade cuisine + serveurs salle
    MenuView.jsx                    ← Carte, formules, thèmes, performance
    StockView.jsx                   ← Stock, fournisseurs, prévisions rupture
    ObjectivesView.jsx              ← Objectifs et défis quotidiens
    StatsView.jsx                   ← Statistiques et grand livre
    ComplaintsView.jsx              ← Plaintes clients

  components/
    ui/                             ← Atomes UI réutilisables (Btn, Badge, Card, Modal…)
    system/
      BankModal.jsx                 ← Prêts bancaires
      HelpModal.jsx                 ← Guide utilisateur + résumé journalier
      Toasts.jsx                    ← Notifications toast
    DailySummaryModal.jsx           ← Résumé fin de journée
    IntroDialog.jsx                 ← Dialogue d'introduction
    LanguageSelect.jsx              ← Sélecteur de langue
    LevelUpModal.jsx                ← Montée de niveau restaurant
    QueueBar.jsx                    ← Barre de file d'attente

  i18n/
    fr.js                           ← Traductions françaises
    en.js                           ← Traductions anglaises
    index.jsx                       ← LangProvider + useLang hook
```

---

## Système de temps

| Unité | Durée réelle |
|-------|-------------|
| 1 minute de jeu | 1 seconde réelle |
| 1 heure de jeu | 60 secondes réelles |
| Journée complète (07h00 → 23h00) | 960 secondes réelles (~16 min) |

- L'**horloge** tourne via `useGameClock` (tick 250 ms), exporte `clockNow`, `gameTime`, `phase`, `isDayOver`
- Les **salaires** sont débités toutes les **60 s réelles** (= 1 h de jeu)
- La **journée est dynamique** : elle démarre à l'heure du plus tôt des shifts actifs et se termine au plus tard (voir Créneaux)

---

## Phases de service

Définies dans `useGameClock.js` — `PHASES`. La phase active est déterminée par `gameTime.absMin`.

| ID | Label | Horaire jeu | spawnRate | prepBonus | patienceMultiplier | priceMultiplier | allowedCats |
|----|-------|-------------|-----------|-----------|-------------------|-----------------|-------------|
| `petit_dejeuner` | ☕ Petit Déjeuner | 07h00–11h00 | ×0,8 | +15 % | ×1,2 | ×1,0 | Petit Déjeuner, Boissons |
| `dejeuner` | 🌞 Déjeuner | 11h00–15h00 | ×2,0 | — | ×0,75 | ×1,0 | Entrées, Plats, Desserts, Boissons |
| `diner` | 🌙 Dîner | 15h00–23h00 | ×1,5 | — | ×0,9 | ×1,10 | Entrées, Plats, Desserts, Boissons |

Seuls les plats dont `cat` figure dans `allowedCats` sont proposés aux clients pendant cette phase.

---

## Créneaux du personnel (Shifts)

Définis dans `useGameClock.js` — `SHIFTS`.

| ID | Label | Horaire jeu |
|----|-------|-------------|
| `matin` | 🌅 Matin | 07h00–15h00 |
| `soir` | 🌙 Soir | 15h00–23h00 |

- Chaque employé (chef, commis, chefs supplémentaires, serveurs) peut avoir `shift: "matin" | "soir" | null`
- `null` = disponible toute la journée (rétrocompatibilité)
- `isOnShift(shift, absMin)` retourne `true` si l'employé est en service pour `absMin`
- Un serveur avec `shift` assigné qui se voit allouer une table sera désassigné automatiquement quand son créneau se termine

**Journée dynamique** — `App.jsx` calcule `activeShifts` (shift avec ≥1 serveur ET ≥1 chef assignés) :
- `dayStartAbs` = `Math.min(...activeShifts.map(sh => sh.startAbs))` — défaut 07h00
- `dayEndAbs` = `Math.max(...activeShifts.map(sh => sh.endAbs))` — défaut 23h00

---

## Mécanique de jeu

### Cycle d'une table

```
LIBRE → occupée (prise de commande) → occupée (en cuisine) → mange → nettoyage → LIBRE
```

- **Prise de commande** : serveur assigné, durée 30/60/90 s selon la taille du groupe
- **Cuisine** : tickets envoyés au chef, timer par plat
- **Repas** : timer = ⅔ du plat le plus long
- **Nettoyage** : 60 s par défaut (réduit à 40 s puis 20 s avec la Station de plonge), démarre quand un serveur disponible est trouvé

### Statuts serveurs

| Statut | Description |
|--------|-------------|
| `actif` | Disponible pour être assigné |
| `service` | En prise de commande ou service de plats (timer `serviceUntil`) |
| `nettoyage` | Nettoie une table (timer `cleanUntil`) |
| `pause` | En pause — moral en récupération, non payé |

Un serveur `actif` n'est assigné que si `moral > 10` ET dans son créneau.

### XP et niveaux serveurs

| Niveau | Nom | XP cumulé requis |
|--------|-----|-----------------|
| 0 | 🎓 Stagiaire | 0 |
| 1 | 👔 Serveur | 80 |
| 2 | ⭐ Senior | 240 |
| 3 | 🎖 Expert | 520 |
| 4 | 👑 Maître | 960 (max) |

- XP par encaissement : `srvXpFromCheckout(groupSize, mood, isVIP)` — `levelUtils.js`
- **Plafond** : `SRV_MAX_XP = 960`
- Le plafond effectif dépend aussi des **exigences de qualité** par niveau de restaurant (`STAFF_QUALITY_REQ` dans `gameData.js`)

### Slots serveurs par niveau restaurant

Définis dans `SERVER_SLOTS_BY_LEVEL` (`gameData.js`) :

| Niv. resto | 0 | 1 | 3 | 5 | 7 | 9 | 10 | 12 | 14 | … | 40+ |
|------------|---|---|---|---|---|---|----|----|----|----|-----|
| Serveurs   | 2 | 3 | 4 | 5 | 6 | 7 |  8 |  9 | 10 | … |  25 |

### Niveaux chef principal

| Niveau | Nom | Vitesse | Commis débloqués | XP cumulé requis |
|--------|-----|---------|-----------------|-----------------|
| 0 | 👨‍🍳 Apprenti | ×1,0 | 1 | 0 |
| 1 | 🧑‍🍳 Cuisinier | ×1,2 | 1 | 120 |
| 2 | 👨‍🍳 Chef de Partie | ×1,5 | 2 | 380 |
| 3 | 🧑‍🍳 Sous-Chef | ×1,8 | 2 | 830 |
| 4 | 👨‍🍳 Chef Cuisine | ×2,2 | 3 | 1 530 |
| 5 | ⭐ Chef Étoilé | ×3,0 | 3 | 2 580 (max) |

- XP par plat : +12 XP chef, +5 XP par commis actif
- **Plafond** : `CHEF_MAX_XP = 2580`

### Chefs supplémentaires

Recrutables dans l'onglet Personnel → Cuisine :

| Slots disponibles | Condition |
|------------------|-----------|
| 1 | Dès le départ |
| 2 | Niv.3 restaurant |
| 3 | Niv.8 restaurant |

Chaque chef supplémentaire renforce la brigade (feux supplémentaires) et peut se voir assigner un créneau.

### Commis

| Niveau | Nom | XP cumulé requis |
|--------|-----|-----------------|
| 0 | 🔪 Débutant | 0 |
| 1 | 🍴 Confirmé | 80 |
| 2 | ⭐ Expert | 280 (max) |

- **Plafond** : `COMMIS_MAX_XP = 280`
- Spécialités : 🍰 Pâtissier (Desserts), 🥩 Rôtisseur (Plats), 🥗 Garde-Manger (Entrées), 🍷 Sommelier (Boissons) — bonus −20 % temps de cuisson sur leur catégorie

### Niveaux restaurant (50 niveaux, 0–49)

5 ères de progression dans `RESTO_LVL` (`gameData.js`) :

| Ère | Niveaux | Exemple |
|-----|---------|---------|
| Établissements locaux | 0–9 | ☕ Café de quartier → 🪵 Estaminet |
| Reconnaissance régionale | 10–19 | 🍽️ Restaurant → 👨‍🍳 Table du Chef |
| Gastronomie étoilée | 20–29 | 🌺 Haute Cuisine → 🏛️ Temple Gastronomique |
| Prestige international | 30–39 | ⭐⭐ Restaurant 2 Étoiles → 🎯 Maison de Référence |
| Légende culinaire | 40–49 | 🌟 Légende Culinaire → 🌠 Olympe |

- Tables : 3 au Niv.0 → 30 max (Niv.42+)
- XP par encaissement : `(20 + groupSize × 8) × moodBonus × (isVIP ? 3 : 1) × themeXpMult`

### Améliorations cuisine

Définies dans `KITCHEN_UPGRADES` (`gameData.js`) :

| ID | Icône | Niv. resto requis | Effet |
|----|-------|------------------|-------|
| `fourneau` | 🔥 | 0 | +1 feu (3 niveaux, jusqu'à +3 feux) |
| `four` | 🏺 | 0 | Cuisson −15/−30/−50 % (3 niveaux) |
| `stockage` | 🧊 | 0 | Capacité stock ×2/×3 (2 niveaux) |
| `plonge` | 🚿 | 0 | Nettoyage −20 s/−20 s (2 niveaux) |
| `salamandre` | 🔆 | 10 | Cuisson −17/−28 % supplémentaires (2 niveaux) |
| `dressage` | 🪨 | 20 | +1/+2 feux simultanés (2 niveaux) |
| `sousvide` | 💧 | 30 | Cuisson −23/−33 % supplémentaires (2 niveaux) |
| `brigade` | 👨‍🍳 | 40 | +2 feux permanents (1 niveau) |

### Réputation (0–100)

Valeur initiale : **50**.

| Palier | Min | Spawn clients | Pourboires |
|--------|-----|--------------|------------|
| 💀 Désastreuse | 0 | ×0,5 | ×0,5 |
| 😟 Dégradée | 20 | ×0,8 | ×0,8 |
| 😐 Neutre | 40 | ×1,0 | ×1,0 |
| 😊 Appréciée | 60 | ×1,1 | ×1,1 |
| 🌟 Réputée | 80 | ×1,2 | ×1,25 |

**Variations par événement :**

| Événement | Delta |
|-----------|-------|
| Note ★★★★★ | +4 |
| Note ★★★★ | +2 |
| Note ★★★ | 0 |
| Note ★★ | −4 |
| Note ★ | −8 |
| Client VIP bien servi | +6 |
| Client perdu | −3 |
| Plainte générée | −5 |
| Inspection ratée | −6 |
| Inspection réussie | +3 |
| Thème Gastronomique (encaissement) | +5 |
| Thème Saisonnier (encaissement) | +8 |

---

## Sauvegarde

- **Clé localStorage** : `resto_save_v1`
- **`sanitizeSave`** (`saveUtils.js`) : nettoie les timers invalides après rechargement, injecte les valeurs par défaut manquantes (`shift: null`, `specialty: null`, etc.)
- Backup via `sendToGDevelop({ type: "SAVE", save })` pour les environnements sans localStorage persistant

---

## Bridge GDevelop ↔ React

### React → GDevelop (postMessage sortant)

Envoyé à chaque tick via `buildGDevelopPayload` → `sendToGDevelop`.

```js
{
  source: "react-ui",
  payload: {
    argent,           // number
    niveaux: {
      restaurant: { niveau, nom, xp, xpProchain, pct },
      chef:       { niveau, nom, xp, vitesse },
      serveurs:   [{ id, nom, niveau, xp, statut, salaire }],
    },
    inventaire:  [{ id, nom, quantite, unite, alerte, prix, categorie }],
    clients:     { enAttente, tablesOccupees, tablesLibres, totalServis, totalPerdus, chiffreAffaires },
    timers:      [{ id, finishAt, label, tableId, cat }],
    savedAt,
  }
}
```

### GDevelop → React (postMessage entrant)

```js
iframe.contentWindow.postMessage(
  { source: "gdevelop", payload: { type: "INIT" } },
  "*"
);
```

| Type | Description |
|------|-------------|
| `INIT` | Initialisation / rechargement avec données de sauvegarde |
| `PING` | Vérification que React est actif |
| `AD_REWARDED` | Récompense publicitaire reçue |

---

## Intégration GDevelop — Code JavaScript

### Bloc 1 — Début de scène (une seule fois)

```javascript
if (window._restoListenerActive) return;
window._restoListenerActive = true;
window._restoData = null;
window._restoDataUpdated = false;

window.addEventListener("message", function(event) {
  if (!event.data || event.data.source !== "react-ui") return;
  const msg = event.data.payload;
  if (!msg) return;
  if (msg.type === "SYNC") {
    window._restoData = msg;
    window._restoDataUpdated = true;
  }
});

const iframe = document.querySelector("iframe");
if (iframe && iframe.contentWindow) {
  iframe.contentWindow.postMessage(
    { source: "gdevelop", payload: { type: "INIT" } }, "*"
  );
}
```

### Bloc 2 — Chaque frame (événement Toujours)

```javascript
if (!window._restoData || !window._restoDataUpdated) return;
window._restoDataUpdated = false;

const msg  = window._restoData;
const vars = runtimeScene.getVariables();

const setN = (n, v) => vars.get(n).setNumber(isNaN(v) ? 0 : (v || 0));
const setS = (n, v) => vars.get(n).setString(String(v || ""));
const setB = (n, v) => vars.get(n).setBoolean(!!v);
const setJ = (n, v) => vars.get(n).setString(JSON.stringify(v ?? null));

setN("argent", msg.argent);

const r = msg.niveaux?.restaurant || {};
setN("restoNiveau", r.niveau); setS("restoNom", r.nom);
setN("restoXp", r.xp); setN("restoXpProchain", r.xpProchain); setN("restoPct", r.pct);

const cl = msg.clients || {};
setN("clientsEnAttente", cl.enAttente); setN("tablesOccupees", cl.tablesOccupees);
setN("tablesLibres", cl.tablesLibres);  setN("chiffreAffaires", cl.chiffreAffaires);
setN("totalServis", cl.totalServis);

setJ("inventaire", msg.inventaire);
setJ("timers",     msg.timers);
```

---

## Branches Git

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `claude/daily-phases-french-nRZIQ` | Branche de développement active (phases, créneaux, chefs supplémentaires) |
