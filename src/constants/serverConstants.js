/* ═══════════════════════════════════════════════════════
   src/constants/serverConstants.js
   Constantes liées aux serveurs : spécialités, formations,
   défis quotidiens.
═══════════════════════════════════════════════════════ */
import { C } from "./gameData";

/* ─── Spécialités serveurs ───────────────────────────── */
export const SRV_SPECIALTIES = [
  { id:"speed",     icon:"⚡", name:"Rapidité",    color:"#1c3352", desc:"−30% temps de prise de commande",  tipMult:1.0,  speedMult:0.70 },
  { id:"charm",     icon:"✨", name:"Charme",       color:"#6b3fa0", desc:"Pourboires +20%",                  tipMult:1.20, speedMult:1.0  },
  { id:"sommelier", icon:"🍷", name:"Sommelier",    color:"#c4622d", desc:"Boissons commandées +30%",         tipMult:1.10, speedMult:1.0  },
  { id:"vip",       icon:"🎩", name:"Gestion VIP",  color:"#b87d10", desc:"Patience clients VIP +30s",        tipMult:1.15, speedMult:1.0  },
];

export const pickSpecialty = () =>
  SRV_SPECIALTIES[Math.floor(Math.random() * SRV_SPECIALTIES.length)];

/* ─── Catalogue de formations serveurs ───────────────── */
export const TRAINING_CATALOG = [
  {
    id:"accueil", icon:"🤝", name:"Accueil & Relation client",
    color:C.purple,
    desc:"Améliore la satisfaction client et les pourboires.",
    levels:[
      { l:1, name:"Initiation",  cost:80,  xp:40,  moralBonus:5,  effect:"Pourboires +5%",             specialtyId:"charm",    desc:"Introduction aux techniques d'accueil." },
      { l:2, name:"Avancé",     cost:180, xp:100, moralBonus:8,  effect:"Pourboires +12%",            specialtyId:"charm",    desc:"Gestion des situations délicates et fidélisation." },
      { l:3, name:"Expert",     cost:350, xp:200, moralBonus:15, effect:"Pourboires +20% + Moral max", specialtyId:"charm",    desc:"Maîtrise complète de l'expérience client." },
    ],
  },
  {
    id:"service", icon:"⚡", name:"Rapidité & Efficacité",
    color:C.navy,
    desc:"Réduit les temps de prise de commande.",
    levels:[
      { l:1, name:"Initiation",  cost:70,  xp:35,  moralBonus:0,  effect:"Commandes −10%",             specialtyId:"speed",    desc:"Optimisation des déplacements en salle." },
      { l:2, name:"Avancé",     cost:160, xp:90,  moralBonus:5,  effect:"Commandes −20%",             specialtyId:"speed",    desc:"Gestion simultanée de plusieurs tables." },
      { l:3, name:"Expert",     cost:320, xp:180, moralBonus:10, effect:"Commandes −30% + XP×2",      specialtyId:"speed",    desc:"Technique de service professionnel haute performance." },
    ],
  },
  {
    id:"sommellerie", icon:"🍷", name:"Sommellerie & Boissons",
    color:C.terra,
    desc:"Augmente les ventes et la qualité du service boissons.",
    levels:[
      { l:1, name:"Initiation",  cost:90,  xp:45,  moralBonus:5,  effect:"Ventes boissons +15%",       specialtyId:"sommelier", desc:"Bases de la dégustation et des accords mets-vins." },
      { l:2, name:"Avancé",     cost:200, xp:110, moralBonus:8,  effect:"Ventes boissons +25%",       specialtyId:"sommelier", desc:"Connaissance approfondie des crus et spiritueux." },
      { l:3, name:"Expert",     cost:400, xp:220, moralBonus:12, effect:"Ventes boissons +40%",       specialtyId:"sommelier", desc:"Certification sommelier — conseils personnalisés." },
    ],
  },
  {
    id:"prestige", icon:"🎩", name:"Gestion VIP & Prestige",
    color:C.amber,
    desc:"Optimise le service des clients importants.",
    levels:[
      { l:1, name:"Initiation",  cost:100, xp:50,  moralBonus:5,  effect:"Patience VIP +15s",          specialtyId:"vip",      desc:"Protocole de service haut de gamme." },
      { l:2, name:"Avancé",     cost:220, xp:120, moralBonus:10, effect:"Patience VIP +30s",          specialtyId:"vip",      desc:"Gestion des personnalités et critiques gastronomiques." },
      { l:3, name:"Expert",     cost:450, xp:240, moralBonus:15, effect:"Patience VIP +45s + XP×2",   specialtyId:"vip",      desc:"Excellence absolue — label Palace." },
    ],
  },
  {
    id:"bienetre", icon:"🧘", name:"Bien-être & Gestion du stress",
    color:C.green,
    desc:"Améliore la résistance à la fatigue et le moral.",
    levels:[
      { l:1, name:"Initiation",  cost:60,  xp:30,  moralBonus:20, effect:"Moral max +10",              specialtyId:null,       desc:"Techniques de récupération rapide." },
      { l:2, name:"Avancé",     cost:130, xp:70,  moralBonus:35, effect:"Moral max +20 + drain −50%", specialtyId:null,       desc:"Gestion de la fatigue en service intensif." },
      { l:3, name:"Expert",     cost:280, xp:140, moralBonus:60, effect:"Moral plein + immunité burnout", specialtyId:null,    desc:"Résilience professionnelle complète." },
    ],
  },
];

// Moral max cumulé selon les formations bien-être
export const getMaxMoral = (sv) => {
  const bienetre = (sv.trainings || {})["bienetre"] || 0;
  return 100 + (bienetre >= 1 ? 10 : 0) + (bienetre >= 2 ? 10 : 0);
};

