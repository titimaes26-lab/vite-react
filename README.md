# Mon Resto Manager — Guide développeur

Application React embarquée dans GDevelop via iframe. Simule la gestion d'un restaurant (salle, cuisine, stock, personnel, objectifs).

---

## Stack technique

| Élément | Version |
|---------|---------|
| React | 18.2 |
| Vite | 4.4 |
| JavaScript | ES Modules |
| Entrée | `main.jsx` → `restaurant-manager.jsx` |

> **Important** : le fichier racine est `restaurant-manager.jsx`, pas `src/App.jsx`.

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
restaurant-manager.jsx      ← Racine React (état global, bridge GDevelop)
src/
  constants/
    gameData.js             ← Données statiques (tables, serveurs, menu, stock…)
    gameConstants.js        ← Règles de jeu (réputation, thèmes, formules)
  utils/
    levelUtils.js           ← Calculs de niveaux (resto, chef, serveur, commis)
    randomUtils.js          ← Génération aléatoire (clients, noms, humeurs)
    orderUtils.js           ← Commandes, tickets cuisine, calcul addition
  hooks/
    useGameClock.js         ← Horloge de jeu (tick 250ms)
    useSpawner.js           ← Arrivée des clients (B/C/D/F)
    useExpiry.js            ← Expiration file, fin nettoyage, libération serveurs
    useSalary.js            ← Paiement des salaires
    useDeliveries.js        ← Livraisons fournisseurs
    useEvents.js            ← Événements aléatoires
    useServerMoral.js       ← Gestion du moral des serveurs
    useChallenges.js        ← Défis quotidiens
    useObjectives.js        ← Objectifs de progression
  views/
    TablesView.jsx          ← Salle (placement, service, encaissement, nettoyage)
    KitchenView.jsx         ← Cuisine (cuisson, service des plats)
    ServersView.jsx         ← Gestion des serveurs
    MenuView.jsx            ← Carte et thèmes
    StockView.jsx           ← Stock et fournisseurs
    ObjectivesView.jsx      ← Objectifs et défis
    StatsView.jsx           ← Statistiques et transactions
    ComplaintsView.jsx      ← Plaintes clients
  components/
    ui/                     ← Composants UI réutilisables (Btn, Badge, Modal…)
```

---

## Mécanique de jeu

### Cycle d'une table

```
LIBRE → occupée (prise de commande) → occupée (en cuisine) → mange → nettoyage → LIBRE
```

- **Prise de commande** : un serveur est assigné, durée 30/60/90s selon taille du groupe
- **Cuisine** : tickets envoyés au chef, timer par plat
- **Repas** : timer basé sur le plat le plus long
- **Nettoyage** : démarre uniquement quand un serveur est disponible ; le serveur est occupé pendant toute la durée

### Serveurs — statuts possibles

| Statut | Description |
|--------|-------------|
| `actif` | Disponible |
| `service` | En prise de commande ou service de plats (timer) |
| `nettoyage` | Nettoyage d'une table (timer = `cleanUntil`) |
| `pause` | En pause (moral en récupération) |

### Niveaux restaurant

| Niveau | Nom | Tables | XP requis |
|--------|-----|--------|-----------|
| 0 | Café de quartier | 3 | 0 |
| 1 | Bistrot | 5 | 300 |
| 2 | Brasserie | 7 | 800 |
| 3 | Restaurant | 9 | 1 800 |
| 4 | Grand Restaurant | 11 | 3 500 |
| 5 | Palace | 12 | 6 000 |

### XP restaurant par encaissement

```
(20 + groupSize × 8) × moodBonus × (isVIP ? 3 : 1)
```

### Réputation (0–100)

| Palier | Min | Clients | Pourboires |
|--------|-----|---------|------------|
| Désastreuse 💀 | 0 | −50% | −50% |
| Dégradée 😟 | 20 | −20% | −20% |
| Neutre 😐 | 40 | ×1 | ×1 |
| Apprécié 😊 | 60 | +10% | +10% |
| Réputé 🌟 | 80 | +20% | +25% |

Variations : `rating5` +4 · `rating4` +2 · `rating3` 0 · `rating2` −4 · `rating1` −8 · `vip` +6 · `lostClient` −3 · `complaint` −5

### Spawner clients

| Paramètre | Valeur |
|-----------|--------|
| Intervalle de base | 35s (niveau 0) → 15s (niveau 5) |
| File max | 4 groupes |
| Probabilité arrivée | 65 % |
| Vague (Rush) | 5 % de chance, 2–3 groupes + toast |
| Salle vide | Force un spawn après 60s d'inactivité |

---

## Bridge GDevelop ↔ React

### React → GDevelop (postMessage sortant)

Envoyé toutes les **2 secondes** via `window.parent.postMessage`.

```js
// Structure du message
{
  source: "react-ui",
  payload: {
    type: "SYNC",
    argent,           // number
    reputation,       // number 0–100
    niveaux: {
      restaurant: { niveau, nom, xp, xpProchain, pct },
      chef:       { niveau, nom, prenom, xp, vitesse, salaire },
      serveurs:   [{ id, nom, niveau, xp, statut, salaire, moral, note, specialite, serviceJusqua, nettoyageJusqua }],
      commis:     [{ id, nom, niveau, xp, statut, salaire }],
    },
    inventaire:       [{ id, nom, quantite, unite, alerte, prix, categorie }],
    menu:             [{ id, nom, prix, categorie, actif, special }],
    formules:         [{ id, nom, actif, remise }],
    platsSpeciaux:    [{ id, nom, prix, categorie }],
    clients: {
      enAttente, enRappel, tablesOccupees, tablesLibres,
      tablesNettoyage, totalServis, totalPerdus, chiffreAffaires,
    },
    tables: [{
      id, nom, statut, capacite, serveur,
      groupe: { taille, nom, humeur, vip },
      commande,        // nb plats commandés
      nettoyageJusqua, // timestamp fin nettoyage
      serveurNettoyage,// id serveur nettoyant
    }],
    cuisine: { platsEnCuisson, platsEnAttente, platsPretsNb, totalCuisines, ameliorations },
    timers:           [{ id, finishAt, label, tableId, cat }],
    platsPretsAServir:[{ id, nom, tableId, tableName, cat }],
    pret:             { montant, restant, mensualite, echeanceAt },
    livraisons:       [{ id, nom, quantite, arriveeAt }],
    plaintes:         [{ id, message, date }],
    transactions:     [{ type, label, montant, date }],  // 50 dernières
    fournisseur,      // string "premium"…
    objectifs: {
      completedIds, pendingClaim, stats,
      defisJour: [{ id, titre, icone, recompense, reclame }],
      dateDefis, progression, clientPerduAujourdhui,
    },
    statsJournalieres:[{ date, revenue, served, lost, rating }],
    theme:            { id, nom, prixMult, repBonus, xpMult },
    evenement:        { id, nom, desc, effect } | null,
    savedAt,          // timestamp
  }
}
```

### GDevelop → React (postMessage entrant)

```js
// Envoyer depuis GDevelop
iframe.contentWindow.postMessage(
  { source: "gdevelop", payload: { type: "INIT", /* données sauvegarde */ } },
  "*"
);
```

| Type | Description |
|------|-------------|
| `INIT` | Initialisation avec données de sauvegarde |
| `PING` | Vérification que React est actif |

### Sauvegarde

- Clé localStorage : `resto_save_v1`
- Mécanisme : dirty flag + intervalle fixe 5s
- La sauvegarde se déclenche uniquement si des données ont changé

---

## Intégration GDevelop — Code JavaScript

### Bloc 1 — Au début de la scène (une seule fois)

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

setN("argent",     msg.argent);
setN("reputation", msg.reputation);
setS("fournisseur",msg.fournisseur);

// Niveau restaurant
const r = msg.niveaux?.restaurant || {};
setN("restoNiveau", r.niveau); setS("restoNom", r.nom);
setN("restoXp", r.xp); setN("restoXpProchain", r.xpProchain); setN("restoPct", r.pct);

// Clients
const cl = msg.clients || {};
setN("clientsEnAttente", cl.enAttente); setN("tablesOccupees", cl.tablesOccupees);
setN("tablesLibres", cl.tablesLibres);  setN("chiffreAffaires", cl.chiffreAffaires);
setN("totalServis", cl.totalServis);

// Cuisine
const cu = msg.cuisine || {};
setN("cuisineEnCuisson", cu.platsEnCuisson); setN("cuisinePrets", cu.platsPretsNb);

// Thème
const th = msg.theme || {};
setS("themeId", th.id); setN("themePrixMult", th.prixMult);

// Prêt
const p = msg.pret || {};
setN("pretRestant", p.restant); setB("pretActif", p.montant > 0);

// JSON brut pour traitements avancés
setJ("tables",      msg.tables);
setJ("serveurs",    msg.niveaux?.serveurs);
setJ("inventaire",  msg.inventaire);
setJ("timers",      msg.timers);
setJ("transactions",msg.transactions);
```

> Le code JavaScript complet (toutes les variables) est disponible en demandant à Claude de le régénérer.

---

## Branches Git

| Branche | Usage |
|---------|-------|
| `main` | Production stable |
| `Test` / `testclaude` | Développement en cours |
| `claude/project-structure-summary-qPQt9` | Branch de session Claude |
