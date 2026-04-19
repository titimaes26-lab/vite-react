/* ═══════════════════════════════════════════════════════
   src/components/IntroDialog.jsx
   Dialogues d'introduction et tutoriels — Élodie & Gustave

   IMAGES attendues dans /public/ :
     /elodie.png   — ratio 16:9  (~1400×788)
     /gustave.png  — ratio 16:9  (~1400×788)
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";
import { C, F } from "../constants/gameData.js";
import { useLang } from "../i18n/index.jsx";

/* ─── Config des personnages ─────────────────────────── */
const SPEAKERS_FR = {
  elodie: {
    name: "Élodie",
    title: "Assistante de gestion",
    img: "/elodie.png",
    color: "#1c3352",
    bubble: { left: "45%", top: "3%", width: "52%", height: "44%" },
  },
  gustave: {
    name: "Gustave",
    title: "Chef de cuisine",
    img: "/gustave.png",
    color: "#b85520",
    bubble: { left: "43%", top: "3%", width: "54%", height: "44%" },
  },
};
const SPEAKERS_EN = {
  elodie: { ...SPEAKERS_FR.elodie, title: "Management Assistant" },
  gustave: { ...SPEAKERS_FR.gustave, title: "Head Chef" },
};

/* ═══════════════════════════════════════════════════════
   DIALOGUE 1 — Introduction
═══════════════════════════════════════════════════════ */
const INTRO_DIALOG = [
  {
    speaker: "elodie",
    text: "Bonjour ! Je suis Élodie, votre assistante de gestion. J'ai analysé les chiffres de ce lieu… Disons que « potentiel » est un mot poli pour « catastrophe financière imminente ».",
    short: "Je suis Élodie. Ce lieu a du « potentiel »… alias catastrophe financière imminente.",
  },
  {
    speaker: "elodie",
    text: "Mon rôle est de m'assurer que nous ne fassions pas faillite avant la fin de la semaine. Le vôtre est de prendre les décisions stratégiques. Et le sien…",
    short: "Moi : éviter la faillite. Vous : les décisions stratégiques. Et lui…",
    note: "Gustave arrive en trombe !",
  },
  {
    speaker: "gustave",
    text: "Sacrilège ! Il n'y a pas un seul grain de sel de Guérande dans cette cuisine ! Comment suis-je censé travailler dans ces conditions ?",
    short: "Sacrilège ! Pas un grain de sel de Guérande ici ! Comment travailler dans ces conditions ?!",
  },
  {
    speaker: "elodie",
    text: "Gustave, je vous présente notre nouveau propriétaire. Vous savez, la personne qui a réellement de l'argent pour acheter votre sel.",
    short: "Gustave, voici le Patron. Celui qui a de l'argent pour acheter votre sel.",
  },
  {
    speaker: "gustave",
    text: "Le Patron ! Enchanté ! Je suis Gustave, le vrai cœur battant de cet établissement. La légende locale de la sauce au poivre !",
    short: "Le Patron ! Je suis Gustave, le cœur de cet établissement. La légende de la sauce au poivre !",
  },
  {
    speaker: "elodie",
    text: "Et la légende locale des factures de beurre impayées…",
  },
  {
    speaker: "gustave",
    text: "Détails ! Mon plan est simple : nous créons le menu le plus divin de la région, et la gloire sera à nous !",
    short: "Détails ! Le plan : le menu le plus divin de la région. La gloire nous attend !",
  },
  {
    speaker: "elodie",
    text: "Mon plan est plus réaliste : deux tables, la gazinière réparée, et des plats avec une marge positive. C'est là que vous intervenez, Patron.",
    short: "Mon plan : deux tables, gazinière réparée, des plats rentables. C'est là que vous intervenez.",
  },
  {
    speaker: "gustave",
    text: "Allez, Patron ! Ne l'écoutez pas, elle parle comme un tableau Excel. Construisez-moi une cuisine digne de ce nom, et je vous promets des miracles !",
    short: "Allez ! Elle parle en tableur. Construisez une vraie cuisine et je vous promets des miracles !",
    note: "Les deux se tournent vers vous…",
  },
  {
    speaker: "elodie",
    text: "La gloire ou le profit… C'est à vous de choisir par où commencer.",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 2 — Tutoriel : L'onglet Tables
═══════════════════════════════════════════════════════ */
const TABLES_DIALOG = [
  {
    speaker: "elodie",
    section: "L'Art de l'Accueil",
    text: "Patron, ouvrez l'onglet Tables. C'est ici que la théorie rencontre la réalité du terrain. Les clients arrivent en groupes toutes les 30 secondes — avec 65 % de chance de franchir la porte.",
    short: "Ouvrez Tables. Les clients arrivent en groupes toutes les 30 s — 65 % de chance d'entrer.",
  },
  {
    speaker: "gustave",
    text: "Et quand ils entrent, c'est pour l'extase ! Mais voyez cette barre de patience ? Si elle vire au rouge et tombe à zéro, ils partent… et mon génie est gaspillé sur des ingrats qui n'ont pas su attendre !",
    short: "Voyez cette barre de patience ? Si elle tombe à zéro, ils partent — et mon génie est gaspillé !",
  },
  {
    speaker: "elodie",
    text: "Surtout, ils partent sans payer. Pour éviter ce drame : cliquez sur une table pour ouvrir son panneau de détails. C'est votre tour de contrôle.",
    short: "Ils partent sans payer ! Cliquez sur une table pour ouvrir son panneau de détails.",
  },
  {
    speaker: "elodie",
    section: "Le Cycle du Service",
    text: "Le processus est une horloge suisse. Le serveur prend la commande, puis dès que vous servez les assiettes, la table passe en mode 🍴 Repas.",
    short: "Le serveur prend la commande, vous servez, la table passe en 🍴 Repas.",
  },
  {
    speaker: "gustave",
    text: "C'est le moment sacré ! Le silence de la dégustation… interrompu uniquement par le bruit des couverts.",
    short: "C'est le moment sacré ! Le silence de la dégustation…",
  },
  {
    speaker: "elodie",
    text: "Puis vient le moment que je préfère : l'encaissement. Mais ne vous reposez pas ! Un serveur doit nettoyer la table avant qu'un nouveau groupe puisse s'installer.",
    short: "Puis l'encaissement ! Mais un serveur doit nettoyer la table avant le prochain groupe.",
  },
  {
    speaker: "gustave",
    section: "Optimisation de l'Espace",
    text: "Patron, j'ai des visions de banquets royaux ! Deux chaises, c'est pour les rendez-vous timides. Il nous faut de la place pour la grandeur !",
    short: "Deux chaises, c'est pour les timides. Il nous faut de la place pour la grandeur !",
  },
  {
    speaker: "elodie",
    text: "Pour une fois, il n'a pas tort. Sur chaque table libre, un bouton permet d'augmenter la capacité. Plus de sièges = des groupes plus grands = plus de chiffre d'affaires.",
    short: "Sur chaque table, un bouton augmente la capacité. Plus de sièges = plus de clients = plus de recettes.",
  },
  {
    speaker: "elodie",
    text: "Gardez un œil sur l'espace : les groupes qui arrivent ne dépasseront jamais votre capacité maximale. Des tables de deux seulement ? Vous raterez les grandes tablées qui rapportent gros.",
    short: "Les groupes ne dépassent jamais votre capacité. Tables de deux seulement ? Vous raterez les grandes tablées.",
  },
  {
    speaker: "gustave",
    text: "Allez, Patron ! Poussez les murs, installez du monde, et laissez-moi les éblouir !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 3 — Tutoriel : L'onglet Serveurs
═══════════════════════════════════════════════════════ */
const SERVERS_DIALOG = [
  {
    speaker: "elodie",
    section: "Brigade et Burnout",
    text: "Parlons ressources humaines. Pour l'instant, nous avons 2 serveurs — le strict minimum pour ne pas ressembler à un self-service. D'autres slots se débloqueront avec le niveau du restaurant.",
    short: "2 serveurs pour l'instant. D'autres slots se débloquent avec le niveau du restaurant.",
  },
  {
    speaker: "gustave",
    text: "Mes plats sont des poèmes, Patron ! Il faut des messagers dignes de ce nom pour les porter. Mais regardez-les… ils ont l'air fatigués.",
    short: "Mes plats sont des poèmes. Il faut des messagers dignes. Mais regardez-les… ils ont l'air fatigués.",
  },
  {
    speaker: "elodie",
    text: "C'est normal, Gustave. Un serveur actif perd 1 point de moral toutes les 5 minutes. S'ils tombent sous 10, c'est le 💀 Burnout : inutiles et indisponibles. Seuls les serveurs au moral solide sont assignés automatiquement.",
    short: "Moral −1 pt/5 min. Sous 10 : 💀 Burnout — inutilisables. Seuls les serveurs solides sont assignés.",
  },
  {
    speaker: "gustave",
    text: "Sacrilège ! On ne peut pas servir un homard avec une mine déconfite ! Qu'ils fassent des pauses pour que leur moral remonte. Un artiste a besoin de repos !",
    short: "On ne sert pas un homard avec une mine déconfite ! Des pauses pour le moral. Un artiste se repose !",
  },
  {
    speaker: "elodie",
    text: "Et le propriétaire a besoin d'économies. Les serveurs sont payés toutes les heures réelles, mais seulement s'ils sont actifs. En pause ou au repos, ils ne coûtent rien. C'est le moment d'être un manager efficace.",
    short: "Salaires uniquement si le serveur est actif. En pause, il ne vous coûte rien. Gérez intelligemment !",
  },
  {
    speaker: "gustave",
    section: "Formation et Évolution",
    text: "Et si on les transformait en véritables maîtres ? Sommellerie, Prestige VIP, Rapidité pour qu'ils courent aussi vite que mon inspiration !",
    short: "Et si on les formait ? Sommellerie, VIP, Rapidité — aussi vite que mon inspiration !",
  },
  {
    speaker: "elodie",
    text: "Les formations en Accueil ou en Bien-être sont aussi cruciales. Elles améliorent leurs spécialités et augmentent leur moral maximal. Plus ils sont formés, moins ils craquent.",
    short: "Accueil et Bien-être améliorent spécialités et moral max. Plus formés, moins de burnouts.",
  },
  {
    speaker: "gustave",
    text: "L'expérience, Patron ! À chaque encaissement, ils gagnent de l'XP. Et plus ils montent de niveau, plus les clients sont généreux sur les pourboires.",
    short: "À chaque encaissement : +XP. Niveau élevé = clients plus généreux en pourboires !",
  },
  {
    speaker: "elodie",
    text: "En résumé : gérez leur fatigue, investissez dans leur formation, et surveillez votre masse salariale. À vous de jouer, Patron.",
    short: "Gérez la fatigue, formez-les, surveillez la masse salariale. À vous, Patron !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 4 — Tutoriel : La Banque
═══════════════════════════════════════════════════════ */
const BANK_DIALOG = [
  {
    speaker: "gustave",
    section: "Le levier financier",
    text: "Élodie, j'ai envie de voir grand pour la nouvelle terrasse, mais mon épargne est un peu... timide. On a des options pour booster le budget ?",
    short: "J'ai envie de voir grand, mais mon épargne est timide. Options pour booster le budget ?",
  },
  {
    speaker: "elodie",
    text: "On appelle ça le levier financier, Gustave. J'ai 3 options de prêts bancaires prêtes : le Petit prêt (1 500 €) pour les bricoles, le Standard (4 000 €) pour du sérieux, et le Grand prêt (9 000 €) si tu veux vraiment refaire la déco du sol au plafond.",
    short: "3 prêts disponibles : Petit (1 500 €), Standard (4 000 €), Grand (9 000 €). À vous selon vos ambitions !",
  },
  {
    speaker: "gustave",
    text: "9 000 € ! Ça en fait des pizzas. Et je rembourse comment ? Je n'ai pas envie d'avoir un huissier en cuisine.",
    short: "9 000 € ! Et je rembourse comment ? Pas d'huissier en cuisine !",
  },
  {
    speaker: "elodie",
    text: "C'est indolore. Le remboursement est automatique par mensualités journalières : une mensualité prélevée à la fin de chaque journée. Règle d'or : un seul prêt actif à la fois. Pour en prendre un autre, il faudra d'abord faire un remboursement anticipé.",
    short: "Remboursement auto — une mensualité par jour. Un seul prêt actif à la fois.",
  },
  {
    speaker: "gustave",
    text: "D'accord, je vais réfléchir. Et niveau charges ? Les salaires, ça donne quoi ce soir ?",
  },
  {
    speaker: "elodie",
    text: "Pas de panique, c'est géré. Les salaires sont débités automatiquement toutes les heures réelles. Je ne paie que les personnels actifs. Ton commis que tu n'as pas encore débloqué ? Il ne nous coûte pas un centime.",
    short: "Salaires débités auto chaque heure, uniquement si le staff est actif. Non débloqué ? Zéro centime.",
  },
  {
    speaker: "gustave",
    text: "Heureusement ! J'avais peur de payer des gens qui regardent les mouches voler.",
  },
  {
    speaker: "elodie",
    text: "Pas ici. Si le staff travaille, l'argent sort. Si tu renvoies tout le monde chez soi, le compteur s'arrête. C'est du flux tendu, Gustave, exactement comme ta cuisson !",
    short: "Staff actif = argent qui sort. Au repos, le compteur s'arrête. Flux tendu, comme ta cuisson !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Statistiques
═══════════════════════════════════════════════════════ */
const STATS_DIALOG = [
  {
    speaker: "gustave",
    section: "Le verdict des chiffres",
    text: "Bon, Élodie, dis-moi la vérité. On a eu un monde fou, mais est-ce que le tiroir-caisse suit la cadence ?",
    short: "Dis-moi la vérité, Élodie. Le tiroir-caisse suit la cadence ?",
  },
  {
    speaker: "elodie",
    text: "Regarde l'onglet Statistiques. J'ai affiché les 3 courbes interactives. En bleu, tes Revenus grimpent, en vert, tes Clients servis suivent... et en doré, ta Réputation décolle.",
    short: "Onglet Statistiques : 3 courbes. Revenus en bleu, Clients en vert, Réputation en doré.",
  },
  {
    speaker: "gustave",
    text: "C'est un peu serré sur l'écran, non ? Je n'y vois pas grand-chose.",
  },
  {
    speaker: "elodie",
    text: "C'est parce que tu es en vue large. Utilise le Sélecteur 5 jours. Si tu veux analyser le rush de ce soir en détail, passe en Zoom 3 jours. C'est plus lisible, non ?",
    short: "Vue trop large ? Utilise le Sélecteur 5 jours ou le Zoom 3 jours pour plus de lisibilité.",
  },
  {
    speaker: "gustave",
    text: "Ah oui, nettement. Et le verdict du jour ?",
  },
  {
    speaker: "elodie",
    text: "Voici ton Compte de résultat : revenus encaissés d'un côté, dépenses de l'autre... et le Résultat Net en gras. Le Panier moyen est en hausse : tes clients dépensent un peu plus que d'habitude, c'est bon signe !",
    short: "Revenus vs dépenses, Résultat Net en gras. Panier moyen en hausse : bon signe !",
  },
  {
    speaker: "gustave",
    text: "Attends, c'est quoi ce gros cercle de couleurs à côté ?",
  },
  {
    speaker: "elodie",
    text: "C'est ton Camembert de répartition : il montre d'où viennent tes revenus par catégorie. Jette aussi un œil à la Masse salariale active — on voit le détail en €/j pour le chef, les commis et les serveurs.",
    short: "Le camembert montre tes revenus par catégorie. Vérifie aussi la Masse salariale — détail €/j par poste.",
  },
  {
    speaker: "gustave",
    text: "Regarde le Tableau journalier en bas, on a eu des clients perdus ?",
  },
  {
    speaker: "elodie",
    text: "La ligne du jour est mise en avant pour que tu ne la rates pas. On a un Taux de service à 95% (la barre est bien verte), mais on a perdu 3 clients à cause de l'attente. Par rapport aux derniers jours, on reste dans notre meilleure moyenne.",
    short: "Taux 95% ✅, mais 3 clients perdus à cause de l'attente. On reste dans notre meilleure moyenne.",
  },
  {
    speaker: "gustave",
    text: "95% ? C'est presque parfait. Allez, ferme-moi tout ça, demain on vise le 100% !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Objectifs
═══════════════════════════════════════════════════════ */
const OBJECTIVES_DIALOG = [
  {
    speaker: "gustave",
    section: "La chasse aux trophées",
    text: "Dis-moi Élodie, j'ai l'impression d'avoir abattu un boulot de titan aujourd'hui. On n'a rien pour marquer le coup ?",
    short: "J'ai abattu un boulot de titan ! On n'a rien pour marquer le coup ?",
  },
  {
    speaker: "elodie",
    text: "Regarde l'onglet Objectifs, Gustave. Tu vois ce petit badge rouge qui clignote ? Ça ne veut pas dire que le four brûle, ça veut dire que tu as des récompenses qui dorment.",
    short: "Onglet Objectifs : ce badge rouge qui clignote ? Des récompenses qui t'attendent !",
  },
  {
    speaker: "gustave",
    text: "Ah ! J'adore quand ça brille. On a quoi au menu des gratifications ?",
  },
  {
    speaker: "elodie",
    text: "On a tes Défis quotidiens. Il y en a 3 chaque jour, tirés au sort. Tu as déjà validé « Service sans faute » et « Maître des pâtes ». Les jalons sur la barre de progression sont passés à l'or.",
    short: "3 défis quotidiens tirés au sort. Tu as déjà validé deux : les jalons sont dorés sur la barre !",
  },
  {
    speaker: "gustave",
    text: "Magnifique ! Et ça me rapporte quoi, concrètement ? Ma banquière va m'aimer davantage ?",
  },
  {
    speaker: "elodie",
    text: "Absolument. Chaque objectif complété te donne des espèces sonnantes et trébuchantes, mais aussi de l'XP restaurant pour monter en grade. Mais ça ne tombe pas tout seul dans ta poche.",
    short: "Chaque objectif = cash + XP restaurant. Mais ça ne tombe pas tout seul dans ta poche !",
  },
  {
    speaker: "gustave",
    text: "Ah bon ? Il y a un piège ?",
  },
  {
    speaker: "elodie",
    text: "Pas de piège, juste un clic. Il faut que tu cliques sur Récupérer pour encaisser tes gains. Sinon, c'est comme laisser un pourboire sur une table : ça finit par disparaître au prochain renouvellement des défis.",
    short: "Clique sur Récupérer pour encaisser. Sinon tes gains disparaissent au prochain renouvellement !",
  },
  {
    speaker: "gustave",
    text: "Hors de question de laisser un centime ! Et pour le troisième défi ? Celui qui n'est pas encore doré ?",
    short: "Pas question de laisser un centime ! Et le troisième défi, pas encore doré ?",
  },
  {
    speaker: "elodie",
    text: "Si tu gères bien ton stock, le badge rouge t'avertira dès que la récompense sera prête. À toi de surveiller et de récupérer avant que le défi expire.",
    short: "Le badge rouge t'alertera dès que la récompense est prête. Récupère avant que le défi expire !",
  },
  {
    speaker: "gustave",
    text: "Allez, je m'y mets. Clique-moi sur ce bouton Récupérer, je veux entendre le bruit des pièces !",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Stock
═══════════════════════════════════════════════════════ */
const STOCK_DIALOG = [
  {
    speaker: "gustave",
    section: "Le coup de feu de 19h",
    text: "Élodie, j'ai un doute affreux. J'ai l'impression qu'on vide le frigo plus vite qu'on ne le remplit. On en est où ?",
    short: "J'ai l'impression qu'on vide le frigo plus vite qu'on ne le remplit. On en est où ?",
  },
  {
    speaker: "elodie",
    text: "Respire, Gustave. Je bascule l'écran en 📊 Vue Graphique. Regarde ces barres horizontales : c'est trié par urgence. Plus la barre est courte, plus on approche de la catastrophe culinaire.",
    short: "Vue Graphique 📊 : barres triées par urgence. Plus la barre est courte, plus c'est critique !",
  },
  {
    speaker: "gustave",
    text: "C'est quoi ce gros bloc qui brille avec une boule de cristal ?",
  },
  {
    speaker: "elodie",
    text: "C'est le bloc 🔮. Il calcule combien de repas on peut sortir avec ce qu'il reste. Pour les tomates cerises, on est en ⛔ Rouge : moins de 3 repas possibles. Autant dire qu'on est à sec.",
    short: "Le bloc 🔮 calcule les repas restants. Tomates cerises : ⛔ Rouge — moins de 3 repas. À sec !",
  },
  {
    speaker: "gustave",
    text: "Panique à bord ! Et pour le reste ?",
  },
  {
    speaker: "elodie",
    text: "Le basilic est en ⚠ Orange, 7 ou 8 plats possibles. La mozzarella est au ✓ Vert, on pourrait nourrir un régiment. Plus de 10 repas garantis.",
    short: "Basilic ⚠ Orange (7-8 plats), mozzarella ✓ Vert (10+ plats). Commander en urgence le rouge !",
  },
  {
    speaker: "gustave",
    text: "Non, laisse comme ça, le graphique me fait peur mais il est clair. Il faut commander. Vite !",
  },
  {
    speaker: "elodie",
    text: "J'ai le doigt sur le bouton 🛒 Commander. Le système va cibler les ingrédients les plus critiques. On joue la carte de l'économie ou de la survie ?",
    short: "Le bouton 🛒 Commander cible les ingrédients critiques. Économie ou urgence ?",
  },
  {
    speaker: "gustave",
    text: "C'est-à-dire ?",
  },
  {
    speaker: "elodie",
    text: "Soit le 🚚 Fournisseur Local : −20% sur la note, mais il faut attendre 2 minutes. Soit le ⚡ Grossiste Premium : prix fort, mais livraison immédiate.",
    short: "🚚 Local : −20% mais 2 min d'attente. ⚡ Premium : prix fort, livraison immédiate.",
  },
  {
    speaker: "gustave",
    text: "2 minutes ? En cuisine, c'est une éternité ! Mais pour 20% d'économie, je vais faire patienter le client avec une mise en bouche. Va pour le local !",
    short: "2 min c'est une éternité ! Mais pour 20% d'économie, on attend. Va pour le local !",
  },
  {
    speaker: "elodie",
    text: "C'est validé. En attendant, je te repasse les stocks en ☰ Vue Liste — plus compact. Pour tout le reste, on est larges. Trie par Catégorie pour t'y retrouver.",
    short: "Validé. Je repasse en ☰ Vue Liste — plus compact. Trie par Catégorie pour t'y retrouver.",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Menu
═══════════════════════════════════════════════════════ */
const MENU_DIALOG = [
  {
    speaker: "elodie",
    section: "L'Alchimie du Menu",
    text: "Patron, il est temps de structurer notre offre. Nous avons trois leviers : la 📋 Carte pour les plats individuels, les 🍽 Formules pour les combos stratégiques, et les 🎨 Thèmes pour donner une ambiance globale à notre cuisine.",
  },
  {
    speaker: "gustave",
    text: "Et surtout, la liberté ! Je viens de doubler le prix de mon Homard Thermidor. L'art n'a pas de prix, n'est-ce pas ?",
  },
  {
    speaker: "elodie",
    text: "L'art a un prix que le client accepte de payer, Gustave. Patron, vous pouvez ajuster les prix sur chaque fiche. Notez bien que les nouveaux tarifs s'appliquent uniquement aux prochaines commandes. On ne change pas l'addition d'un client qui est déjà en train de manger !",
    short: "Ajustez les prix sur chaque fiche. Les nouveaux tarifs s'appliquent aux prochaines commandes seulement.",
  },
  {
    speaker: "gustave",
    text: "Regardez, j'ai aussi cliqué sur ce petit bouton ⏸. Ma Soupe à l'Oignon me barbait ce matin, alors je l'ai mise en pause. Disparue ! Envolée !",
    short: "J'ai cliqué ⏸ sur la Soupe à l'Oignon ce matin. Disparue ! Envolée !",
  },
  {
    speaker: "elodie",
    text: "Exactement. Le bouton ⏸ désactive le plat : il reste dans nos archives, mais les clients ne le commanderont plus. C'est pratique pour gérer les stocks... ou les caprices du Chef.",
    short: "⏸ désactive le plat : archivé, plus commandé. Pratique pour les stocks… ou les caprices du Chef.",
  },
  {
    speaker: "gustave",
    text: "Et regardez ce magnifique Badge 🔥 ! C'est la consécration ! Mon Filet Mignon est la star du quartier !",
  },
  {
    speaker: "elodie",
    text: "Ce badge récompense le score composé. Pour l'obtenir, le Patron doit jongler entre : 40% de marge brute (l'argent qui reste en caisse), 40% de popularité (le plaisir des clients), 20% de disponibilité (avoir les ingrédients en stock).",
    short: "Badge 🔥 = score composé : 40% marge, 40% popularité, 20% disponibilité en stock.",
  },
  {
    speaker: "gustave",
    text: "Marge, stock... Vous parlez comme une épicière ! Patron, cherchez le feu ! Cherchez le 🔥 ! C'est lui qui fera de nous des rois !",
    short: "Vous parlez comme une épicière ! Patron, cherchez le 🔥 — il fera de nous des rois !",
  },
  {
    speaker: "elodie",
    text: "Et c'est la marge qui nous permettra de payer le gaz pour vos fourneaux. À vous de fixer les priorités, Patron.",
    short: "C'est la marge qui paye le gaz pour vos fourneaux. À vous les priorités, Patron.",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   DIALOGUE 5 — Tutoriel : L'onglet Cuisine
═══════════════════════════════════════════════════════ */
const KITCHEN_DIALOG = [
  {
    speaker: "gustave",
    section: "Le Feu Sacré... et la Rigueur",
    text: "Regardez-moi cette bête, Patron ! Elle n'attend que mon talent. Pour lancer la magie, il suffit de cliquer sur un plat ou sur « Tout démarrer » pour embraser tous les brûleurs d'un coup !",
    short: "Elle n'attend que mon talent ! Cliquez sur un plat ou « Tout démarrer » pour embraser tous les brûleurs !",
  },
  {
    speaker: "elodie",
    text: "C'est surtout une question d'optimisation d'espace. Un brûleur vide est un brûleur qui nous coûte de l'argent. Remplissez les feux libres, mais ne vous laissez pas déborder par votre ego, Gustave.",
    short: "Un brûleur vide coûte de l'argent. Remplissez les feux libres, sans ego excessif.",
  },
  {
    speaker: "gustave",
    text: "Déborder ? Jamais ! Dès que le petit ✅ PRÊT s'affiche sur chaque plat d'une même commande, c'est l'heure du spectacle ! On clique sur 🍽 Servir et la salle s'illumine de saveurs !",
    short: "Quand ✅ PRÊT s'affiche sur tous les plats d'une commande, on clique 🍽 Servir et la salle s'illumine !",
  },
  {
    speaker: "elodie",
    text: "Et surtout, le client passe en phase repas, ce qui nous rapproche enfin du moment où il paye l'addition. C'est l'étape cruciale.",
    short: "Le client passe en phase repas — on se rapproche de l'encaissement. Étape cruciale !",
  },
  {
    speaker: "gustave",
    text: "C'est aussi l'étape de ma gloire personnelle ! Chaque plat envoyé me rapporte +12 XP. Je deviens chaque jour plus légendaire !",
    short: "Ma gloire ! Chaque plat envoyé : +12 XP. Je deviens chaque jour plus légendaire !",
  },
  {
    speaker: "elodie",
    text: "N'oubliez pas vos commis, Gustave. Ils ne font pas ça pour la gloire, mais ils apprennent à vos côtés. Ils gagnent 40% de votre expérience. S'ils progressent, l'établissement progresse.",
    short: "Les commis gagnent 40% de votre XP. Leur progrès, c'est le vôtre !",
  },
  {
    speaker: "gustave",
    text: "40% ? C'est généreux ! Allez, Patron, assez de théorie ! Les brûleurs sont froids, les clients ont faim et mon talent trépigne d'impatience... On lance la première commande ?",
    short: "40% ? Généreux ! Assez de théorie — les brûleurs sont froids et mon talent trépigne ! On lance ?",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   ENGLISH DIALOG DATA
═══════════════════════════════════════════════════════ */
const INTRO_DIALOG_EN = [
  {
    speaker: "elodie",
    text: "Hello! I'm Élodie, your management assistant. I've analyzed the numbers for this place… Let's say 'potential' is a polite word for 'imminent financial disaster.'",
    short: "I'm Élodie. This place has 'potential'… aka imminent financial disaster.",
  },
  {
    speaker: "elodie",
    text: "My role is to ensure we don't go bankrupt before the end of the week. Yours is to make the strategic decisions. And his…",
    short: "Me: avoid bankruptcy. You: strategic decisions. And him…",
    note: "Gustave bursts in!",
  },
  {
    speaker: "gustave",
    text: "Outrageous! There isn't a single grain of Guérande salt in this kitchen! How am I supposed to work under these conditions?",
    short: "Outrageous! Not one grain of Guérande salt here! How can I work like this?!",
  },
  {
    speaker: "elodie",
    text: "Gustave, meet our new owner. You know, the person who actually has money to buy your salt.",
    short: "Gustave, meet the Boss. The one with money to buy your salt.",
  },
  {
    speaker: "gustave",
    text: "The Boss! Delighted! I'm Gustave, the true beating heart of this establishment. The local legend of pepper sauce!",
    short: "The Boss! I'm Gustave, the heart of this establishment. The legend of pepper sauce!",
  },
  {
    speaker: "elodie",
    text: "And the local legend of unpaid butter bills…",
  },
  {
    speaker: "gustave",
    text: "Details! My plan is simple: we create the most divine menu in the region, and glory will be ours!",
    short: "Details! The plan: the most divine menu in the region. Glory awaits!",
  },
  {
    speaker: "elodie",
    text: "My plan is more realistic: two tables, the stove fixed, and dishes with a positive margin. That's where you come in, Boss.",
    short: "My plan: two tables, stove fixed, profitable dishes. That's where you come in.",
  },
  {
    speaker: "gustave",
    text: "Come on, Boss! Don't listen to her, she talks like a spreadsheet. Build me a proper kitchen, and I promise you miracles!",
    short: "Come on! She talks in spreadsheets. Build a real kitchen and I promise miracles!",
    note: "Both turn toward you…",
  },
  {
    speaker: "elodie",
    text: "Glory or profit… It's up to you to choose where to begin.",
    isLast: true,
  },
];

const TABLES_DIALOG_EN = [
  {
    speaker: "elodie",
    section: "The Art of Hospitality",
    text: "Boss, open the Tables tab. This is where theory meets reality. Customers arrive in groups every 30 seconds — with a 65% chance of walking through the door.",
    short: "Open Tables. Customers arrive every 30s — 65% chance of walking in.",
  },
  {
    speaker: "gustave",
    text: "And when they come in, it's for pure bliss! But see that patience bar? If it turns red and hits zero, they leave… and my genius is wasted on ingrates who couldn't wait!",
    short: "See that patience bar? If it hits zero, they leave — and my genius is wasted!",
  },
  {
    speaker: "elodie",
    text: "More importantly, they leave without paying. To avoid this drama: click on a table to open its detail panel. That's your control tower.",
    short: "They leave without paying! Click on a table to open its detail panel.",
  },
  {
    speaker: "elodie",
    section: "The Service Cycle",
    text: "The process runs like clockwork. The server takes the order, then as soon as you serve the plates, the table switches to 🍴 Dining mode.",
    short: "Server takes order, you serve, table switches to 🍴 Dining.",
  },
  {
    speaker: "gustave",
    text: "The sacred moment! The silence of tasting… broken only by the sound of cutlery.",
    short: "The sacred moment! The silence of tasting…",
  },
  {
    speaker: "elodie",
    text: "Then comes my favourite part: collecting the bill. But don't rest yet! A server must clean the table before a new group can sit down.",
    short: "Then the payout! But a server must clean the table before the next group.",
  },
  {
    speaker: "gustave",
    section: "Space Optimisation",
    text: "Boss, I have visions of royal banquets! Two chairs is for shy dates. We need room for greatness!",
    short: "Two chairs is for shy dates. We need room for greatness!",
  },
  {
    speaker: "elodie",
    text: "For once, he's not wrong. On each free table, a button lets you increase capacity. More seats = larger groups = more revenue.",
    short: "On each table, a button increases capacity. More seats = more customers = more revenue.",
  },
  {
    speaker: "elodie",
    text: "Keep an eye on space: arriving groups will never exceed your maximum capacity. Only two-seat tables? You'll miss the large parties that bring in the most money.",
    short: "Groups never exceed your capacity. Only two-seaters? You'll miss the big, high-spending parties.",
  },
  {
    speaker: "gustave",
    text: "Come on, Boss! Push the walls, fill the place, and let me dazzle them!",
    isLast: true,
  },
];

const SERVERS_DIALOG_EN = [
  {
    speaker: "elodie",
    section: "Staff & Burnout",
    text: "Let's talk human resources. For now, we have 2 servers — the bare minimum to avoid looking like a cafeteria. More slots will unlock as the restaurant levels up.",
    short: "2 servers for now. More slots unlock as the restaurant levels up.",
  },
  {
    speaker: "gustave",
    text: "My dishes are poetry, Boss! We need worthy messengers to carry them. But look at them… they seem tired.",
    short: "My dishes are poetry. We need worthy messengers. But look at them… they seem tired.",
  },
  {
    speaker: "elodie",
    text: "That's normal, Gustave. An active server loses 1 morale point every 5 minutes. Below 10, it's 💀 Burnout: useless and unavailable. Only servers with solid morale are auto-assigned.",
    short: "Morale −1pt/5min. Below 10: 💀 Burnout — unusable. Only solid-morale servers are auto-assigned.",
  },
  {
    speaker: "gustave",
    text: "Outrageous! You can't serve lobster with a miserable face! Let them take breaks to recover morale. An artist needs rest!",
    short: "You can't serve lobster with a miserable face! Breaks for morale. An artist needs rest!",
  },
  {
    speaker: "elodie",
    text: "And the owner needs savings. Servers are paid every real-world hour, but only when active. On break or resting, they cost nothing. Time to be an efficient manager.",
    short: "Wages only when active. On break, they cost nothing. Manage smartly!",
  },
  {
    speaker: "gustave",
    section: "Training & Growth",
    text: "What if we turned them into true masters? Sommelier skills, VIP Prestige, Speed so they run as fast as my inspiration!",
    short: "What if we trained them? Sommelier, VIP, Speed — as fast as my inspiration!",
  },
  {
    speaker: "elodie",
    text: "Hospitality and Wellbeing training are just as crucial. They improve specialities and raise maximum morale. The better-trained they are, the less they break down.",
    short: "Hospitality and Wellbeing improve specialities and max morale. Better trained = fewer burnouts.",
  },
  {
    speaker: "gustave",
    text: "Experience, Boss! Every time a bill is collected, they earn XP. And the higher their level, the more generous customers are with tips.",
    short: "Every payout: +XP. Higher level = more generous tips!",
  },
  {
    speaker: "elodie",
    text: "In summary: manage their fatigue, invest in their training, and watch your wage bill. Your move, Boss.",
    short: "Manage fatigue, train them, watch the wage bill. Your move, Boss!",
    isLast: true,
  },
];

/* ═══════════════════════════════════════════════════════
   COMPOSANT GÉNÉRIQUE — DialogScene
═══════════════════════════════════════════════════════ */
function DialogScene({ dialogData, ctaLabel = "OK", onDone }) {
  const { lang, t } = useLang();
  const SPEAKERS = lang === "en" ? SPEAKERS_EN : SPEAKERS_FR;

  const [step,     setStep]     = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [textAnim, setTextAnim] = useState(true);
  const [imgKey,   setImgKey]   = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 480);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(tm);
  }, []);

  useEffect(() => {
    setTextAnim(false);
    const tm = setTimeout(() => setTextAnim(true), 60);
    return () => clearTimeout(tm);
  }, [step]);

  const line   = dialogData[step];
  const sp     = SPEAKERS[line.speaker];
  const isLast = line.isLast || step === dialogData.length - 1;
  const nextSp = !isLast ? SPEAKERS[dialogData[step + 1]?.speaker] : null;
  const bub    = sp.bubble;

  const next = () => {
    if (isLast) {
      setVisible(false);
      setTimeout(onDone, 350);
      return;
    }
    if (dialogData[step + 1].speaker !== line.speaker) {
      setImgKey(k => k + 1);
    }
    setStep(s => s + 1);
  };

  const skip = (e) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(onDone, 350);
  };

  return (
    <div
      onClick={next}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(8,6,4,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "12px 12px 16px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        cursor: "pointer",
      }}
    >
      {/* Bouton Passer */}
      <button
        onClick={skip}
        style={{
          position: "absolute", top: 14, right: 14,
          padding: "5px 14px",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 20, color: "rgba(255,255,255,0.6)",
          fontSize: 11, cursor: "pointer", fontFamily: F.body, zIndex: 1,
        }}
      >
        {t("dialog.skip")}
      </button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 860,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {/* Ligne d'identité : section + personnage */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: textAnim ? 1 : 0,
          transform: textAnim ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}>
          {/* Section (chapitre) */}
          <div>
            {line.section && (
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: sp.color + "99",
                fontFamily: F.title, letterSpacing: "0.12em",
                textTransform: "uppercase", marginBottom: 2,
              }}>
                ── {line.section} ──
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: sp.color,
                boxShadow: `0 0 8px ${sp.color}`,
                flexShrink: 0,
              }}/>
              <span style={{
                fontSize: 12, fontWeight: 700, color: sp.color,
                fontFamily: F.title, letterSpacing: "0.05em",
              }}>
                {sp.name}
              </span>
              <span style={{
                fontSize: 10, color: "rgba(255,255,255,0.35)",
                fontFamily: F.body,
              }}>
                — {sp.title}
              </span>
            </div>
          </div>

          {/* Compteur étape */}
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.3)",
            fontFamily: F.body,
          }}>
            {step + 1} / {dialogData.length}
          </div>
        </div>

        {/* Image + overlay bulle (conteneur 16:9) */}
        <div style={{
          position: "relative",
          width: "100%",
          paddingBottom: "56.25%",
          borderRadius: 16,
          overflow: "hidden",
          background: "#111",
        }}>
          <img
            key={`${line.speaker}-${imgKey}`}
            src={sp.img}
            alt={sp.name}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", borderRadius: 16,
              animation: "introImgIn 0.32s ease both",
            }}
          />

          {/* Texte sur la bulle */}
          <div
            style={{
              position: "absolute",
              left: bub.left, top: bub.top,
              width: bub.width, height: bub.height,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1% 5% 9%",
              pointerEvents: "none",
            }}
          >
            <p style={{
              margin: 0,
              fontSize: "clamp(10px, 1.55vw, 14px)",
              color: "#1a120a",
              fontFamily: F.body,
              lineHeight: 1.5,
              textAlign: "center",
              fontWeight: 500,
              opacity: textAnim ? 1 : 0,
              transform: textAnim ? "translateY(0)" : "translateY(5px)",
              transition: "opacity 0.28s ease, transform 0.28s ease",
            }}>
              {(isMobile && line.short) ? line.short : line.text}
            </p>
          </div>

          {/* Hint tap */}
          <div style={{
            position: "absolute", bottom: 10, right: 14,
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            fontFamily: F.body,
            animation: "tapPulse 2s ease-in-out infinite",
          }}>
            {!isLast && t("dialog.tapContinue")}
          </div>
        </div>

        {/* Note de mise en scène */}
        {line.note && (
          <div style={{
            textAlign: "center",
            fontSize: 11, color: "#c8a96a",
            fontFamily: F.body, fontStyle: "italic",
            opacity: textAnim ? 1 : 0,
            transition: "opacity 0.35s ease 0.1s",
          }}>
            ✦ {line.note}
          </div>
        )}

        {/* Barre de contrôles */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "0 2px", marginTop: 2,
        }}>
          {/* Points de progression */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {dialogData.map((d, i) => {
              const isCurrent = i === step;
              const isDone    = i < step;
              const dot       = SPEAKERS[d.speaker];
              return (
                <div key={i} style={{
                  width: isCurrent ? 16 : 6, height: 6,
                  borderRadius: 99,
                  background: isCurrent
                    ? dot.color
                    : isDone ? dot.color + "66" : "rgba(255,255,255,0.18)",
                  transition: "all 0.3s ease",
                }}/>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Prochain personnage */}
            {nextSp && nextSp.name !== sp.name && (
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,0.35)",
                fontFamily: F.body,
              }}>
                {t("dialog.nextSpeaker", { name: nextSp.name })}
              </div>
            )}

            {/* Bouton principal */}
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              style={{
                padding: "11px 28px",
                background: isLast
                  ? `linear-gradient(135deg,${C.green},#2d7a50)`
                  : sp.color,
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 14, fontWeight: 700,
                fontFamily: F.body, cursor: "pointer",
                boxShadow: `0 4px 18px ${isLast ? C.green : sp.color}55`,
                transition: "background 0.3s, box-shadow 0.3s",
                letterSpacing: "0.01em",
              }}
            >
              {isLast ? `✅ ${ctaLabel}` : t("dialog.next")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes introImgIn {
          from { opacity:0; transform:scale(1.03); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes tapPulse {
          0%,100% { opacity:0.45; }
          50%     { opacity:0.9; }
        }
      `}</style>
    </div>
  );
}

/* ─── Exports ────────────────────────────────────────── */
function useDialogCta(key) {
  const { lang, t } = useLang();
  return t(key + "Tutorial.cta") !== key + "Tutorial.cta"
    ? t(key + "Tutorial.cta")
    : t("intro.cta");
}

export function IntroDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={INTRO_DIALOG} ctaLabel={t("intro.cta")} onDone={onDone} />;
}

export function TablesDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={TABLES_DIALOG} ctaLabel={t("tablesTutorial.cta")} onDone={onDone} />;
}

export function ServersDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={SERVERS_DIALOG} ctaLabel={t("serversTutorial.cta")} onDone={onDone} />;
}

export function BankDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={BANK_DIALOG} ctaLabel={t("bankTutorial.cta")} onDone={onDone} />;
}

export function StatsDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={STATS_DIALOG} ctaLabel={t("statsTutorial.cta")} onDone={onDone} />;
}

export function ObjectivesDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={OBJECTIVES_DIALOG} ctaLabel={t("objectivesTutorial.cta")} onDone={onDone} />;
}

export function StockDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={STOCK_DIALOG} ctaLabel={t("stockTutorial.cta")} onDone={onDone} />;
}

export function MenuDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={MENU_DIALOG} ctaLabel={t("menuTutorial.cta")} onDone={onDone} />;
}

export function KitchenDialog({ onDone }) {
  const { t } = useLang();
  return <DialogScene dialogData={KITCHEN_DIALOG} ctaLabel={t("kitchenTutorial.cta")} onDone={onDone} />;
}
