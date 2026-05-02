/* ═══════════════════════════════════════════════════════
   src/constants/helpContent.js
   Contenu textuel du guide utilisateur in-game.
═══════════════════════════════════════════════════════ */

export const HELP_SECTIONS = [
  {
    icon:"⊞", title:"Tables",
    color:"#1e5c38",
    items:[
      {q:"Arrivée des clients",a:"Un groupe arrive environ toutes les 30 secondes (65 % de chance). La taille du groupe ne dépasse jamais la capacité des tables libres. La file d'attente continue de s'alimenter même si vous êtes sur un autre onglet."},
      {q:"Humeur et patience",a:"🤩 Enthousiaste (45 s, ×1,5 XP) · 😊 Détendu (35 s, ×1,2 XP) · 😐 Neutre (25 s) · 😑 Pressé (18 s) · 😤 Impatient (11 s, ×0,6 XP). La patience est affichée par une barre qui passe du vert au rouge. Si elle atteint 0, le groupe part sans consommer et vous perdez 3 points de réputation."},
      {q:"Placement automatique vs manuel",a:"Si une table libre et un serveur actif (en service, bon moral, dans son créneau) sont disponibles, cliquez ▶ Placer pour installer le groupe automatiquement. Sinon, ouvrez la modale pour choisir vous-même la table et le serveur."},
      {q:"Timeline de phases",a:"Chaque table affiche une barre en 4 segments : 🛎 Commande (bleu) → 🔥 Cuisine (orange) → 🍴 Repas (vert) → 🧹 Nettoyage (jaune). Chaque segment se remplit progressivement. La durée cuisine = plat le plus long encore en cuisson."},
      {q:"Prise de commande",a:"Le serveur prend la commande selon la taille du groupe : ~30 s (2 couverts), ~60 s (4 couverts), ~90 s (6 couverts). La spécialité ⚡ Rapidité réduit ce délai de 30 %."},
      {q:"Repas en cours",a:"Une fois les plats servis (🍽 Servir), la table passe en repas pour ~⅔ du temps du plat le plus long. Le bouton Encaisser reste verrouillé pendant ce délai."},
      {q:"Nettoyage",a:"Après l'encaissement, un serveur disponible nettoie la table pendant 60 s (réduit à 40 s puis 20 s avec les améliorations Station de plonge). La table redevient libre automatiquement."},
      {q:"Agrandir une table",a:"Sur chaque table libre, un bouton permet d'augmenter la capacité : 2 → 4 couverts pour 800 €, puis 4 → 6 couverts pour 1 800 €. Des groupes plus grands arriveront ensuite."},
      {q:"File d'attente — rappel",a:"Un groupe parti avant d'être placé reste rappelable 2 minutes dans la liste d'attente. Cliquez ↩ Rappeler pour le remettre en tête de file avec +15 s de patience."},
      {q:"Réorganiser la file",a:"Les boutons ↑↓ sur chaque ticket permettent de prioriser les groupes. Un indicateur de backlog (temps total estimé) s'affiche en haut de la liste."},
      {q:"Plan de salle / Vue grille",a:"Basculez entre le plan SVG et la vue grille via le bouton 🗺 / ⊞. Le plan affiche toutes les tables avec leur statut coloré. Cliquez une table pour ouvrir son panneau de détail."},
    ]
  },
  {
    icon:"🕐", title:"Phases & Créneaux",
    color:"#8b5cf6",
    items:[
      {q:"3 phases de service",a:"☕ Petit Déjeuner (07h–11h) · 🌞 Déjeuner (11h–15h) · 🌙 Dîner (15h–23h). La phase active est affichée dans le header. Chaque phase modifie le comportement du restaurant."},
      {q:"Effets du Petit Déjeuner",a:"Taux d'affluence modéré (×0,8). La patience des clients est augmentée (×1,2). La cuisson est accélérée (+15 %). Seuls les plats des catégories Petit Déjeuner et Boissons sont disponibles à la commande."},
      {q:"Effets du Déjeuner",a:"Affluence maximale (×2,0). La patience des clients est réduite (×0,75) — les groupes s'impatientent vite. Plats de toutes catégories disponibles (Entrées, Plats, Desserts, Boissons)."},
      {q:"Effets du Dîner",a:"Forte affluence (×1,5). Patience légèrement réduite (×0,9). Prix des plats majorés de +10 %. Toutes catégories disponibles. C'est la phase la plus rentable."},
      {q:"Créneaux du personnel",a:"Chaque employé (chef, commis, chefs supplémentaires, serveurs) peut se voir assigner un créneau : 🌅 Matin (07h–15h) ou 🌙 Soir (15h–23h). Hors de son créneau, l'employé n'est pas disponible. Un employé sans créneau est disponible toute la journée."},
      {q:"Journée dynamique",a:"La journée de jeu démarre au plus tôt actif parmi vos shifts, et se termine au plus tard. Un shift est 'actif' si au moins 1 serveur ET 1 chef (principal ou supplémentaire) lui sont assignés. Sans shift actif, la journée dure de 07h à 23h par défaut."},
      {q:"Assigner un créneau",a:"Dans l'onglet Personnel → Cuisine ou Salle, chaque carte employé affiche un sélecteur '🕐 Créneau' avec 3 boutons : — (aucun / toujours dispo), 🌅 07h–15h, 🌙 15h–23h."},
    ]
  },
  {
    icon:"👤", title:"Serveurs",
    color:"#162d4a",
    items:[
      {q:"Équipe et slots",a:"Le restaurant démarre avec 2 serveurs. Des slots supplémentaires se débloquent avec le niveau du restaurant : Niv.1 → 3 serveurs, Niv.3 → 4, Niv.5 → 5, Niv.7 → 6, Niv.9 → 7, Niv.10 → 8, etc. (jusqu'à 25 au Niv.40+)."},
      {q:"Statuts",a:"Actif → disponible pour être assigné. En pause → indisponible et non payé. 🛎 En service → prend une commande. 🧹 Nettoyage → nettoie une table. Seuls les serveurs actifs avec moral > 10 et dans leur créneau sont assignés."},
      {q:"Moral",a:"Le moral baisse de 1 pt toutes les 5 minutes si le serveur est actif. Il remonte en pause. En dessous de 10 → 💀 Burnout : le serveur ne prend plus aucune commande. Utilisez 🎁 Prime 50€ pour remonter un moral bas rapidement."},
      {q:"Créneaux de travail",a:"Assignez 🌅 Matin ou 🌙 Soir pour qu'un serveur travaille uniquement pendant son shift. Si une table lui est assignée et que son créneau se termine, elle est automatiquement libérée et réassignée."},
      {q:"Spécialités",a:"Débloquées au niveau 2 : ⚡ Rapidité (−30 % prise de commande), ✨ Charme (+20 % pourboires), 🍷 Sommelier (+10 % pourboires), 🎩 VIP (+15 % pourboires + repère clients VIP). Améliorée au niveau 4 (effet ×2)."},
      {q:"Formations",a:"5 domaines : Accueil, Rapidité, Sommellerie, Prestige VIP, Bien-être. Chacun a 3 niveaux progressifs. Les formations améliorent les spécialités et augmentent le moral maximal."},
      {q:"Expérience et niveaux",a:"5 niveaux : 🎓 Stagiaire → 👔 Serveur → ⭐ Senior → 🎖 Expert → 👑 Maître. Les pourboires et l'XP gagné augmentent avec le niveau. Le plafond d'XP dépend du tier du restaurant (requis de qualité)."},
      {q:"Salaires",a:"Débités automatiquement toutes les heures réelles pour les serveurs actifs. En pause ou hors créneau, pas de déduction."},
      {q:"Exigences de qualité",a:"À partir du Niv.10 restaurant, le jeu exige un minimum de serveurs qualifiés. Ex : Niv.15 → au moins 1 Senior ; Niv.25 → 1 Expert ; Niv.40 → 1 Maître. Un badge indique si l'exigence est remplie."},
    ]
  },
  {
    icon:"👨‍🍳", title:"Cuisine",
    color:"#b85520",
    items:[
      {q:"Brigade de cuisine",a:"L'onglet Personnel → Cuisine gère la brigade : 1 chef principal, jusqu'à 3 commis (débloqués par le niveau du chef), et jusqu'à 3 chefs supplémentaires (débloqués par le niveau du restaurant : 1 dès le départ, 2 au Niv.3, 3 au Niv.8)."},
      {q:"Chef principal",a:"6 niveaux : Apprenti (×1,0) → Cuisinier (×1,2) → Chef de Partie (×1,5) → Sous-Chef (×1,8) → Chef Cuisine (×2,2) → Chef Étoilé (×3,0). Le multiplicateur réduit tous les temps de cuisson. Gagne +12 XP par plat terminé."},
      {q:"Commis",a:"Jusqu'à 3 commis débloqués selon le niveau du chef (1 dès Niv.0, 2 à Niv.2, 3 à Niv.4). Chaque commis actif ajoute +15 % de vitesse de cuisson. Ils ont des spécialités : Pâtissier (Desserts), Rôtisseur (Plats), Garde-Manger (Entrées), Sommelier (Boissons)."},
      {q:"Chefs supplémentaires",a:"Des chefs additionnels peuvent être recrutés pour renforcer la brigade. Chaque chef supplémentaire ajoute des feux de cuisson supplémentaires. Jusqu'à 2 slots au Niv.3 restaurant, 3 slots au Niv.8."},
      {q:"Créneaux cuisine",a:"Le chef, les commis et les chefs supplémentaires peuvent se voir assigner un créneau 🌅 Matin ou 🌙 Soir. La journée dynamique ne démarrera que si au moins 1 chef (principal ou supplémentaire) et 1 serveur partagent le même créneau actif."},
      {q:"Moral de brigade",a:"Le moral collectif (0–100) affecte la vitesse de cuisson : ≥70 → +bonus vitesse 😊 ; <30 → malus de vitesse 😟. Une prime 💸 150 € ajoute +30 points de moral. Le moral monte naturellement entre les services."},
      {q:"Feux de cuisson",a:"4 feux de base. Augmentez avec : Fourneau (+1 feu ×3 niveaux), Formation brigade du chef (+1 feu temporaire 72h), Plan de travail grand chef (+1 ou +2 feux), Brigade étoilée (+2 feux permanents). Cliquez ▶ sur un plat ou 'Tout démarrer' pour remplir les feux libres."},
      {q:"Temps de cuisson",a:"Calculé en multipliant le temps de base par : chef (×0,33 à ×1,0), commis (−15 % chacun), améliorations Four (jusqu'à −50 %), Salamandre (jusqu'à −45 %), Sous-vide (jusqu'à −56 %). La phase Petit Déjeuner ajoute −15 % supplémentaire."},
      {q:"Tickets de commande",a:"Chaque table a un ticket ordonnable (boutons ↑↓). Couleur selon l'attente : 🟢 <3 min · 🟡 3–5 min · 🔴 >5 min. Un badge 'retard' s'affiche sur les tickets dépassant 5 minutes."},
      {q:"Servir une table",a:"Quand tous les plats d'une table sont prêts (✅ PRÊT), le bouton 🍽 Servir apparaît. La table passe en phase repas puis en attente d'encaissement."},
      {q:"Améliorations cuisine",a:"🔥 Fourneau (+1 feu, 3 niveaux, 600→2 200 €) · 🏺 Four professionnel (−50 % total, 3 niveaux) · 🧊 Chambre froide (capacité stock ×3, 2 niveaux) · 🚿 Plonge (nettoyage −20s×2) · 🔆 Salamandre (Niv.10, −45 %) · 🪨 Plan de travail (Niv.20, +2 feux) · 💧 Sous-vide (Niv.30) · 👨‍🍳 Brigade étoilée (Niv.40, +2 feux)."},
      {q:"Formations du chef",a:"4 formations disponibles dans la carte chef : 📚 Techniques avancées (+80 XP, 200 €) · 🍰 Cours pâtisserie (Desserts −20 %, 280 €) · 🫕 Maîtrise sauces (Plats −20 %, 280 €) · 👥 Stage brigade (+1 feu pendant 72h, 350 €)."},
    ]
  },
  {
    icon:"📋", title:"Menu",
    color:"#5c2e96",
    items:[
      {q:"4 sous-onglets",a:"📋 Carte (plats actifs + prix), 🍽 Formules (menus combinés), 🎨 Thèmes (modificateurs globaux), 📊 Performance (analyse de rentabilité)."},
      {q:"Catégories et phases",a:"Les plats sont répartis en : Petit Déjeuner, Entrées, Plats, Desserts, Boissons. Pendant le Petit Déjeuner, seuls les plats 'Petit Déjeuner' et 'Boissons' sont proposés aux clients."},
      {q:"Prix dynamique",a:"Sur chaque carte, ajustez le prix : −10 %, −5 %, +5 %, +10 %, +20 %. Le bouton ↺ réinitialise au prix de base. Un modificateur de +10 % s'applique automatiquement pendant la phase Dîner."},
      {q:"Activer / Désactiver",a:"Le bouton ⏸ retire un plat du menu sans le supprimer. Les plats désactivés ne sont plus commandés par les clients. Désactiver un plat hors-phase évite les erreurs de stock."},
      {q:"Score de rentabilité",a:"Chaque plat a un score : 40 % marge brute + 40 % popularité + 20 % disponibilité stock. Badge 🔥 pour le plat le mieux noté. Utilisez cet indicateur pour décider quoi mettre en avant."},
      {q:"Formules",a:"3 modèles : Menu Découverte (−12 %, 3 services), Menu Express (−8 %, 2 services), Menu Prestige (−15 %, 4 services). Configurez les plats de chaque catégorie puis activez la formule."},
      {q:"Thèmes",a:"🍺 Bistrot (×0,90 prix) · ⭐ Gastronomique (×1,15 prix, +5 rép, +20 % XP) · 🌿 Saisonnier (+8 rép, +10 % XP). Le thème actif s'applique à chaque encaissement."},
      {q:"Plats du jour",a:"2 plats aléatoires sont mis en avant chaque heure avec −20 % de réduction. Ils apparaissent dans la file d'attente et dans l'onglet Tables pour guider les choix des clients."},
    ]
  },
  {
    icon:"📦", title:"Stocks",
    color:"#162d4a",
    items:[
      {q:"3 modes de vue",a:"⊞ Cartes (accordéon par catégorie), ☰ Liste (tableau compact), 📊 Graphique (barres triées par urgence). Triez par urgence, catégorie ou alphabétique."},
      {q:"Prévision rupture",a:"Le bloc 🔮 calcule combien de repas chaque ingrédient peut encore couvrir selon les recettes actives : ✓ vert (>10 repas) · ⚠ orange (<10) · ⛔ rouge (<3 ou épuisé)."},
      {q:"Commander selon prévision",a:"Le bouton 🛒 Commander réapprovisionne automatiquement les 3 ingrédients les plus critiques jusqu'au niveau optimal, en tenant compte du fournisseur actif."},
      {q:"Fournisseurs",a:"⚡ Grossiste Premium : prix plein, livraison instantanée. 🚚 Fournisseur Local : −20 % mais livraison en 2 minutes. Les livraisons en cours s'affichent avec une barre de progression."},
      {q:"Chambre froide",a:"Sans amélioration, le stock est limité. Niv.1 Chambre froide → capacité ×2. Niv.2 → capacité ×3. Cette amélioration est indispensable pour servir de longues journées sans rupture."},
      {q:"KPI inventaire",a:"4 métriques en haut : alertes stock, valeur totale de l'inventaire, ruptures prévues, nombre d'articles. Mis à jour en temps réel à chaque commande."},
    ]
  },
  {
    icon:"🎯", title:"Objectifs & Défis",
    color:"#a06c08",
    items:[
      {q:"Séries d'objectifs",a:"16 objectifs en 4 séries : Premiers pas, Croissance, Excellence, Légende. Chaque objectif complété donne des espèces et de l'XP restaurant. Cliquez Récupérer pour encaisser la récompense."},
      {q:"Défis quotidiens",a:"3 défis renouvelés chaque jour, tirés au sort selon la date. Catégories : clients servis, recettes, notes, rush express, service VIP, salle comble, pourboires. Récompenses immédiates."},
      {q:"Jalons de progression",a:"Une frise chronologique affiche 6 jalons clés (10 clients, 50 clients, 1k€, 5k€, 20k€, niveaux avancés). Les jalons atteints s'illuminent en or."},
      {q:"Badge et notifications",a:"Un badge rouge sur l'onglet Objectifs indique les récompenses prêtes + défis complétés. Les toasts sont cliquables pour accéder directement à la récompense."},
    ]
  },
  {
    icon:"💰", title:"Finances",
    color:"#a06c08",
    items:[
      {q:"Caisse",a:"Le restaurant démarre avec 5 000 €. Affiché en vert (≥200 €) ou rouge (critique). Cliquez sur 💰 pour ouvrir le Grand Livre."},
      {q:"Résultat du jour",a:"Dans l'onglet Statistiques : revenus encaissés, dépenses du jour et résultat net. La masse salariale active (chef + commis + chefs supplémentaires + serveurs) est détaillée en €/h."},
      {q:"Grand livre",a:"Toutes les transactions avec résumé Recettes / Dépenses / Résultat net. Limité aux 200 dernières entrées. Filtrez par type (revenus / dépenses / salaires)."},
      {q:"Prêts bancaires",a:"3 options : Petit prêt (1 500 €), Standard (4 000 €), Grand prêt (9 000 €). Remboursement automatique par mensualités horaires. Un seul prêt actif à la fois. Remboursement anticipé possible."},
      {q:"Salaires",a:"Débités automatiquement toutes les heures réelles pour les personnels actifs (dans leur créneau). Un chef supplémentaire sans créneau et hors service n'est pas comptabilisé."},
    ]
  },
  {
    icon:"📊", title:"Statistiques",
    color:"#1e5c38",
    items:[
      {q:"Graphiques linéaires",a:"3 courbes SVG interactives : Revenus, Clients servis, Réputation. Passez la souris sur un point pour voir la valeur exacte. Un indicateur ↗/↘ montre la tendance vs le jour précédent."},
      {q:"Période",a:"Sélecteur 3 jours / 5 jours pour zoomer ou élargir la vue temporelle."},
      {q:"Analyse financière",a:"Compte de résultat du jour (revenus, dépenses, résultat net), masse salariale active, camembert de répartition des revenus par catégorie de menu, panier moyen par table."},
      {q:"Réputation",a:"Jauge circulaire SVG avec palier actuel, effets sur les pourboires et le taux de spawn clients. Barre de progression vers le palier suivant."},
      {q:"Tableau journalier",a:"Les N derniers jours : clients servis, perdus, taux de service (barre colorée) et revenus. La ligne du jour en cours est mise en avant."},
    ]
  },
  {
    icon:"⭐", title:"Réputation",
    color:"#5c2e96",
    items:[
      {q:"5 paliers",a:"💀 Désastreuse (0–19) · 😟 Dégradée (20–39) · 😐 Neutre (40–59) · 😊 Appréciée (60–79) · 🌟 Réputée (80+). Chaque palier modifie les pourboires et le taux d'arrivée des clients (×0,5 à ×1,25)."},
      {q:"Gain de réputation",a:"★★★★★ +4 pts · ★★★★ +2 pts · ★★★ 0 pt · ★★ −4 pts · ★ −8 pts. Client VIP servi +6 pts. Bonus selon le thème actif (Gastronomique +5, Saisonnier +8)."},
      {q:"Perte de réputation",a:"Client perdu −3 pts · Plainte générée −5 pts · Amende inspection −6 pts. Passage inspection réussi +3 pts."},
      {q:"Effets en jeu",a:"Plus la réputation est haute, plus les pourboires sont généreux et plus les clients arrivent vite. Visible dans le header et le détail de l'onglet Statistiques."},
    ]
  },
  {
    icon:"⚠", title:"Plaintes",
    color:"#b85520",
    items:[
      {q:"Génération automatique",a:"Une plainte est générée si la note est ≤ 2 étoiles lors d'un encaissement, ou suite à une amende d'inspection sanitaire."},
      {q:"Liste des plaintes",a:"Triées de la plus récente à la plus ancienne. Badge ● NOUVEAU sur les plaintes non consultées. Priorités : haute (rouge), moyenne (orange), basse (bleu)."},
      {q:"Alerte header",a:"L'alerte 💬 dans le header indique le nombre de nouvelles plaintes. Cliquez dessus pour accéder directement à l'onglet — le badge disparaît après consultation."},
    ]
  },
  {
    icon:"🏆", title:"Niveau Restaurant",
    color:"#a06c08",
    items:[
      {q:"50 niveaux (0–49)",a:"Le restaurant évolue de ☕ Café de quartier (Niv.0) jusqu'à 🌠 Olympe (Niv.49) en 5 ères : Établissements locaux (0–9), Reconnaissance régionale (10–19), Gastronomie étoilée (20–29), Prestige international (30–39), Légende culinaire (40–49)."},
      {q:"Gain d'XP",a:"Chaque encaissement ajoute de l'XP modifié par : humeur du groupe (×0,6 à ×1,5), statut VIP (+bonus), thème Gastronomique (+20 % XP), thème Saisonnier (+10 % XP)."},
      {q:"Tables débloquées",a:"Niv.0 → 3 tables, Niv.1 → 4, Niv.2 → 5, Niv.3 → 6, Niv.4 → 7... jusqu'à 30 tables max (Niv.42+). Les nouvelles tables apparaissent automatiquement dans le plan de salle."},
      {q:"Serveurs débloqués",a:"Niv.0 → 2 serveurs, Niv.1 → 3, Niv.3 → 4, Niv.5 → 5, Niv.7 → 6, Niv.9 → 7, Niv.10 → 8, et ainsi de suite jusqu'à 25 serveurs au Niv.40+."},
      {q:"Chefs supplémentaires",a:"1 slot chef supplémentaire dès le départ, 2e slot au Niv.3, 3e slot au Niv.8. Ces chefs renforcent la brigade et ajoutent des feux de cuisson."},
      {q:"Événements aléatoires",a:"Toutes les ~4 minutes réelles : 🔍 Inspection sanitaire (amende ou bonus réput.) · ⚡ Rush inattendu (3 groupes ajoutés d'un coup) · 🧊 Panne frigo (stocks partiellement réduits) · 🎩 Critique Michelin (client VIP à satisfaire)."},
    ]
  },
];
