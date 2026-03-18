import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Sauvegarde localStorage ─────────────────────────── */
const SAVE_KEY = "resto_save_v1";

const saveToLocalStorage = (state) => {
    if (!window.localStorage) {
        console.error("LocalStorage non supporté sur ce navigateur");
        return;
    }
    try {
        const payload = JSON.stringify({
            ...state,
            savedAt: Date.now()
        });
        window.localStorage.setItem(SAVE_KEY, payload);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert("Espace de stockage saturé sur la tablette !");
        } else {
            console.warn("Erreur de sauvegarde :", error);
        }
    }
};

const saveGame = (state) => saveToLocalStorage(state);

const loadGame = async () => {
    try {
        if (!window.localStorage) return null;
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch(e) { return null; }
};

// resetGame est appelé depuis l'intérieur du composant App
// pour pouvoir réinitialiser les états React sans reload

/* ─── Pont de communication React ↔ GDevelop ──────────── */
// Envoie un message structuré au parent (GDevelop via iframe)
const sendToGDevelop = (payload) => {
  try {
    window.parent.postMessage({ source: "react-ui", payload }, "*");
  } catch(e) {
    console.warn("[GDevelop Bridge] postMessage échoué :", e);
  }
};

// Construit le payload standardisé depuis les états React
const buildGDevelopPayload = ({ cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats }) => {
  const rl = restoLv(restoXp);
  const cl = chefLv(kitchen?.chef?.totalXp || 0);
  return {
    argent: cash,
    niveaux: {
      restaurant: {
        niveau    : rl.l,
        nom       : RESTO_LVL[rl.l]?.name || "",
        xp        : restoXp,
        xpProchain: rl.next?.xpNeeded || 0,
        pct       : rl.pct,
      },
      chef: {
        niveau : cl.l,
        nom    : CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.name || "",
        xp     : kitchen?.chef?.totalXp || 0,
        vitesse: CHEF_LVL[Math.min(cl.l, CHEF_LVL.length-1)]?.speed || 1,
      },
      serveurs: (servers || []).map(s => {
        const sl = srvLv(s.totalXp);
        return { id: s.id, nom: s.name, niveau: sl.l, xp: s.totalXp, statut: s.status, salaire: s.salary };
      }),
    },
    inventaire: (stock || []).map(s => ({
      id: s.id, nom: s.name, quantite: s.qty, unite: s.unit,
      alerte: s.qty <= s.alert, prix: s.price, categorie: s.cat,
    })),
    clients: {
      enAttente      : (queue || []).length,
      tablesOccupees : (tables || []).filter(t => t.status === "occupée" || t.status === "mange").length,
      tablesLibres   : (tables || []).filter(t => t.status === "libre").length,
      totalServis    : objStats?.totalServed    || 0,
      totalPerdus    : (dailyStats || []).reduce((s, d) => s + (d.lost || 0), 0),
      chiffreAffaires: objStats?.totalRevenue   || 0,
    },
    // Timers : finishAt (timestamp absolu) pour précision cross-plateforme
    timers: (kitchen?.cooking || []).map(d => ({
      id      : String(d.id),
      finishAt: d.startedAt + d.timerMax * 1000,
      label   : d.name + (d.tableName ? " · " + d.tableName : ""),
      tableId : d.tableId || null,
      cat     : d.cat || "",
    })),
    savedAt: Date.now(),
  };
};

// Nettoie les états liés aux timers qui ne sont plus valides après un rechargement
const sanitizeSave = (save) => {
  const now = Date.now();
  const tables = (save.tables || []).map(t => {
    if (t.status === "nettoyage") {
      if (!t.cleanUntil || now >= t.cleanUntil)
        return { ...t, status: "libre", server: null, cleanUntil: null, cleanDur: null, freedAt: now };
      return t;
    }
    if (t.status === "mange") return { ...t, eatUntil: null, eatDur: null };
    if (t.status === "occupée") return { ...t, svcUntil: null };
    return t;
  });
  const servers = (save.servers || []).map(s =>
    s.status === "service" ? { ...s, status: "actif", serviceUntil: null } : s
  );
  const kitchen = save.kitchen ? {
    ...save.kitchen,
    queue: [...(save.kitchen.queue || []), ...(save.kitchen.cooking || []).map(d => ({
      ...d, startedAt: undefined, timerMax: undefined
    }))],
    cooking: [],
    done: save.kitchen.done || [],
  } : null;
  return { ...save, tables, servers, kitchen, queue: [] };
};

/* ─── Palette ─────────────────────────────────────────── */
const C = {
  bg:"#f4f0e8", surface:"#ffffff", card:"#fdfbf6", border:"#ddd4c0",
  green:"#2a5c3f", greenL:"#3d7a57", greenP:"#eaf3ed",
  terra:"#c4622d", terraP:"#fdf0e8", terraL:"#e07a45",
  navy:"#1c3352",  navyP:"#e8edf4",
  ink:"#1a1612",   muted:"#8a7d6a",
  red:"#c0392b",   redP:"#fdecea",
  amber:"#b87d10", amberP:"#fdf5e0",
  purple:"#6b3fa0",purpleP:"#f0eaf8",
  white:"#ffffff",
};

const F = {
  title:"Georgia,'Times New Roman',serif",
  body:"'Segoe UI',system-ui,-apple-system,sans-serif",
};

/* ─── XP / Level system ───────────────────────────────── */

const SERVER_SLOTS_BY_LEVEL={0:2,1:3,2:4,3:5,4:6,5:8};

const SERIES_COLORS={
  Revenus: C.amber,
  Clients: C.green,
  Niveau:  C.purple,
  Salle:   C.navy,
};
const SERIES_LABELS={
  Revenus:"💶 Revenus",
  Clients:"🍽 Clients",
  Niveau: "⭐ Niveau",
  Salle:  "🪑 Salle",
};

const SRV_LVL = [
  { name:"Stagiaire", color:C.muted,  icon:"🎓" },
  { name:"Serveur",   color:C.green,  icon:"👔" },
  { name:"Senior",    color:C.navy,   icon:"⭐" },
  { name:"Expert",    color:C.amber,  icon:"🎖" },
  { name:"Maître",    color:C.purple, icon:"👑" },
];

/* ─── Spécialités serveurs ───────────────────────────── */
const SRV_SPECIALTIES = [
  { id:"speed",    icon:"⚡", name:"Rapidité",     color:"#1c3352", desc:"−30% temps de prise de commande",  tipMult:1.0,  speedMult:0.70 },
  { id:"charm",    icon:"✨", name:"Charme",        color:"#6b3fa0", desc:"Pourboires +20%",                  tipMult:1.20, speedMult:1.0  },
  { id:"sommelier",icon:"🍷", name:"Sommelier",     color:"#c4622d", desc:"Boissons commandées +30%",         tipMult:1.10, speedMult:1.0  },
  { id:"vip",      icon:"🎩", name:"Gestion VIP",   color:"#b87d10", desc:"Patience clients VIP +30s",        tipMult:1.15, speedMult:1.0  },
];
const pickSpecialty = () => SRV_SPECIALTIES[Math.floor(Math.random()*SRV_SPECIALTIES.length)];

/* ─── Catalogue de formations serveurs ───────────────── */
const TRAINING_CATALOG = [
  {
    id:"accueil", icon:"🤝", name:"Accueil & Relation client",
    color:C.purple,
    desc:"Améliore la satisfaction client et les pourboires.",
    levels:[
      { l:1, name:"Initiation",  cost:80,  xp:40,  moralBonus:5,  effect:"Pourboires +5%",       specialtyId:"charm",   desc:"Introduction aux techniques d'accueil." },
      { l:2, name:"Avancé",     cost:180, xp:100, moralBonus:8,  effect:"Pourboires +12%",      specialtyId:"charm",   desc:"Gestion des situations délicates et fidélisation." },
      { l:3, name:"Expert",     cost:350, xp:200, moralBonus:15, effect:"Pourboires +20% + Moral max", specialtyId:"charm", desc:"Maîtrise complète de l'expérience client." },
    ]
  },
  {
    id:"service", icon:"⚡", name:"Rapidité & Efficacité",
    color:C.navy,
    desc:"Réduit les temps de prise de commande.",
    levels:[
      { l:1, name:"Initiation",  cost:70,  xp:35,  moralBonus:0,  effect:"Commandes −10%",        specialtyId:"speed",   desc:"Optimisation des déplacements en salle." },
      { l:2, name:"Avancé",     cost:160, xp:90,  moralBonus:5,  effect:"Commandes −20%",        specialtyId:"speed",   desc:"Gestion simultanée de plusieurs tables." },
      { l:3, name:"Expert",     cost:320, xp:180, moralBonus:10, effect:"Commandes −30% + XP×2", specialtyId:"speed",   desc:"Technique de service professionnel haute performance." },
    ]
  },
  {
    id:"sommellerie", icon:"🍷", name:"Sommellerie & Boissons",
    color:C.terra,
    desc:"Augmente les ventes et la qualité du service boissons.",
    levels:[
      { l:1, name:"Initiation",  cost:90,  xp:45,  moralBonus:5,  effect:"Ventes boissons +15%",  specialtyId:"sommelier", desc:"Bases de la dégustation et des accords mets-vins." },
      { l:2, name:"Avancé",     cost:200, xp:110, moralBonus:8,  effect:"Ventes boissons +25%",  specialtyId:"sommelier", desc:"Connaissance approfondie des crus et spiritueux." },
      { l:3, name:"Expert",     cost:400, xp:220, moralBonus:12, effect:"Ventes boissons +40%",  specialtyId:"sommelier", desc:"Certification sommelier — conseils personnalisés." },
    ]
  },
  {
    id:"prestige", icon:"🎩", name:"Gestion VIP & Prestige",
    color:C.amber,
    desc:"Optimise le service des clients importants.",
    levels:[
      { l:1, name:"Initiation",  cost:100, xp:50,  moralBonus:5,  effect:"Patience VIP +15s",     specialtyId:"vip",     desc:"Protocole de service haut de gamme." },
      { l:2, name:"Avancé",     cost:220, xp:120, moralBonus:10, effect:"Patience VIP +30s",     specialtyId:"vip",     desc:"Gestion des personnalités et critiques gastronomiques." },
      { l:3, name:"Expert",     cost:450, xp:240, moralBonus:15, effect:"Patience VIP +45s + XP×2", specialtyId:"vip",  desc:"Excellence absolue — label Palace." },
    ]
  },
  {
    id:"bienetre", icon:"🧘", name:"Bien-être & Gestion du stress",
    color:C.green,
    desc:"Améliore la résistance à la fatigue et le moral.",
    levels:[
      { l:1, name:"Initiation",  cost:60,  xp:30,  moralBonus:20, effect:"Moral max +10",         specialtyId:null,      desc:"Techniques de récupération rapide." },
      { l:2, name:"Avancé",     cost:130, xp:70,  moralBonus:35, effect:"Moral max +20 + drain −50%", specialtyId:null,  desc:"Gestion de la fatigue en service intensif." },
      { l:3, name:"Expert",     cost:280, xp:140, moralBonus:60, effect:"Moral plein + immunité burnout", specialtyId:null, desc:"Résilience professionnelle complète." },
    ]
  },
];
// Max moral bonus (cumul toutes formations bien-être)
const getMaxMoral = (sv) => {
  const bienetre = (sv.trainings||{})["bienetre"] || 0;
  return 100 + (bienetre>=1?10:0) + (bienetre>=2?10:0);
};
// moral : 0-100. descend quand actif, monte en pause + pourboires
const MORAL_DRAIN_INTERVAL = 300000; // −1 toutes les 5 min réelles si actif
const MORAL_PAUSE_GAIN     = 3;      // +3 toutes les 5 min si en pause
const moralColor = (m) => m>=70?C.green:m>=40?C.amber:C.red;
const moralIcon  = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralLabel = (m) => m>=70?"En forme":m>=40?"Fatigué":m>=20?"Épuisé":"Burnout";

const srvLv = (xp) => {
  const cap=[80,160,280,440];
  let l=0,r=xp;
  while(l<cap.length && r>=cap[l]){r-=cap[l];l++;}
  return {l,r,n:cap[l]||999};
};

/* ─── Chef & Commis levels ────────────────────────────── */
// commis unlocked: niv 0-1 → 1 commis | niv 2-3 → 2 commis | niv 4-5 → 3 commis
const CHEF_LVL = [
  { name:"Apprenti",      color:C.muted,  bg:C.bg,      icon:"👨‍🍳", commis:1, speed:1.0,  xpNeeded:[0,120,260,450,700,1050] },
  { name:"Cuisinier",     color:C.green,  bg:C.greenP,  icon:"🧑‍🍳", commis:1, speed:1.2  },
  { name:"Chef de Partie",color:C.navy,   bg:C.navyP,   icon:"👨‍🍳", commis:2, speed:1.5  },
  { name:"Sous-Chef",     color:C.amber,  bg:C.amberP,  icon:"🧑‍🍳", commis:2, speed:1.8  },
  { name:"Chef Cuisine",  color:C.terra,  bg:C.terraP,  icon:"👨‍🍳", commis:3, speed:2.2  },
  { name:"Chef Étoilé",   color:C.purple, bg:C.purpleP, icon:"⭐",   commis:3, speed:3.0  },
];
const CHEF_XP_CAP = [120,260,450,700,1050];
const chefLv = (xp) => {
  let l=0,r=xp;
  while(l<CHEF_XP_CAP.length && r>=CHEF_XP_CAP[l]){r-=CHEF_XP_CAP[l];l++;}
  return {l,r,n:CHEF_XP_CAP[l]||999};
};

const COMMIS_LVL = [
  { name:"Débutant",  color:C.muted,  icon:"🔪" },
  { name:"Confirmé",  color:C.green,  icon:"🍴" },
  { name:"Expert",    color:C.amber,  icon:"⭐" },
];
const COMMIS_XP_CAP = [80,200];
const commisLv = (xp) => {
  let l=0,r=xp;
  while(l<COMMIS_XP_CAP.length && r>=COMMIS_XP_CAP[l]){r-=COMMIS_XP_CAP[l];l++;}
  return {l,r,n:COMMIS_XP_CAP[l]||999};
};

// Effective cook time: dish base prepTime reduced by chef speed & commis bonus
const dishCookTime = (prepTime, chefSpeed, commisCount) =>
  Math.max(5, Math.round(prepTime / (chefSpeed * (1 + commisCount * 0.15))));

/* ─── Random helpers ──────────────────────────────────── */
const NAMES1=["Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo","Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"];
const NAMES2=["Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"];
const MOODS=[
  {e:"🤩",l:"Enthousiaste",p:45,b:1.5},
  {e:"😊",l:"Détendu",     p:35,b:1.2},
  {e:"😐",l:"Neutre",      p:25,b:1.0},
  {e:"😑",l:"Pressé",      p:18,b:0.8},
  {e:"😤",l:"Impatient",   p:11,b:0.6},
];
const pick=(a)=>a[Math.floor(Math.random()*a.length)];
const rName=()=>`${pick(NAMES1)} ${pick(NAMES2)}`;
const rMood=()=>pick(MOODS);
const rSize=()=>pick([1,2,2,2,3,3,4,4,6]);

/* ─── Auto order generator ────────────────────────────── */
const generateOrder=(group,menu)=>{
  const by=cat=>menu.filter(m=>m.cat===cat&&m.enabled!==false);
  const items=[];
  // 1 plat par personne
  for(let i=0;i<group.size;i++) if(by("Plats").length) items.push(pick(by("Plats")));
  // ~60% chance d'entrée pour la table
  const nS=Math.round(group.size*0.5)*(Math.random()>0.4?1:0);
  for(let i=0;i<nS;i++) if(by("Entrées").length) items.push(pick(by("Entrées")));
  // ~40% chance de dessert
  if(Math.random()>0.6&&by("Desserts").length)
    for(let i=0;i<Math.ceil(group.size*0.5);i++) items.push(pick(by("Desserts")));
  // 1 boisson par personne
  for(let i=0;i<group.size;i++) if(by("Boissons").length) items.push(pick(by("Boissons")));
  // Grouper en lignes
  const map={};
  items.forEach((m,idx)=>{
    if(!map[m.id]) map[m.id]={
      oid:Date.now()+idx+Math.random(),
      menuId:m.id,item:m.name,cat:m.cat,
      price:m.price,qty:0,
      prepTime:m.prepTime||60,
      ingredients:m.ingredients||[]
    };
    map[m.id].qty++;
  });
  return Object.values(map);
};

// Use daily special prices when generating orders
const generateOrderWithSpecials=(group,menu)=>{
  const orders=generateOrder(group,menu);
  return orders.map(o=>{
    const dish=menu.find(m=>m.id===o.menuId);
    if(dish?.isSpecial) return{...o,price:dish.price,isSpecial:true};
    return o;
  });
};

/* ─── Restaurant level — unlocks tables ───────────────── */
const RESTO_LVL=[
  {l:0,name:"Café de quartier",  icon:"☕",  tables:3,  xpNeeded:0,    color:C.muted },
  {l:1,name:"Bistrot",           icon:"🍺",  tables:5,  xpNeeded:300,  color:C.green },
  {l:2,name:"Brasserie",         icon:"🍽",  tables:7,  xpNeeded:800,  color:C.navy  },
  {l:3,name:"Restaurant",        icon:"⭐",  tables:9,  xpNeeded:1800, color:C.terra },
  {l:4,name:"Grand Restaurant",  icon:"🌟",  tables:11, xpNeeded:3500, color:C.purple},
  {l:5,name:"Palace",            icon:"👑",  tables:12, xpNeeded:6000, color:C.amber },
];
const restoLv=(xp)=>{
  let lv=0;
  for(let i=RESTO_LVL.length-1;i>=0;i--){if(xp>=RESTO_LVL[i].xpNeeded){lv=i;break;}}
  const cur=RESTO_LVL[lv];
  const next=RESTO_LVL[Math.min(lv+1,RESTO_LVL.length-1)];
  const needed=next.xpNeeded-cur.xpNeeded;
  const rem=xp-cur.xpNeeded;
  return{l:lv,d:cur,next,pct:lv>=RESTO_LVL.length-1?100:Math.min(100,Math.round(rem/needed*100))};
};
const mkT=(id,name,cap=2,capLv=0)=>({id,name,capacity:cap,capLv,status:"libre",server:null,order:[],svcTimer:0,svcMax:0,group:null});
const CAP_UPGRADES=[
  {capLv:0,label:"Agrandir (×2→4)",cost:800, newCap:4},
  {capLv:1,label:"Agrandir (×4→6)",cost:1800,newCap:6},
];
const TABLES0=[
  mkT(1,"Table 1"),  mkT(2,"Table 2"),  mkT(3,"Table 3"),
  mkT(4,"Table 4"),  mkT(5,"Table 5"),  mkT(6,"Table 6"),
  mkT(7,"Table 7"),  mkT(8,"Table 8"),  mkT(9,"Table 9"),
  mkT(10,"Table 10"),mkT(11,"Table 11"),mkT(12,"Table 12"),
];
const SERVERS0=[
  {id:1,name:"Marie Dupont",  status:"actif",totalXp:320,rating:4.8,salary:14,moral:90,specialty:SRV_SPECIALTIES[1]},
  {id:2,name:"Pierre Martin", status:"actif",totalXp:180,rating:4.5,salary:12,moral:75,specialty:null},
];
/* ─── Primary elements (raw ingredients only) ─────────── */
const STOCK0=[
  // Viandes & Poissons             price = coût d'achat par unité
  {id:1,  name:"Bœuf",            qty:12,  unit:"kg",    alert:3,   cat:"Viandes",  price:18   },
  {id:2,  name:"Saumon",          qty:8,   unit:"kg",    alert:2,   cat:"Poissons", price:22   },
  {id:3,  name:"Poulet",          qty:10,  unit:"pcs",   alert:3,   cat:"Viandes",  price:9    },
  {id:4,  name:"Foie gras",       qty:2,   unit:"kg",    alert:0.5, cat:"Fins",     price:95   },
  // Légumes & Herbes
  {id:5,  name:"Laitue romaine",  qty:20,  unit:"pcs",   alert:5,   cat:"Légumes",  price:1.2  },
  {id:6,  name:"Oignons",         qty:8,   unit:"kg",    alert:2,   cat:"Légumes",  price:1.5  },
  {id:7,  name:"Champignons",     qty:6,   unit:"kg",    alert:1,   cat:"Légumes",  price:8    },
  {id:8,  name:"Ail",             qty:3,   unit:"kg",    alert:0.5, cat:"Légumes",  price:4    },
  {id:9,  name:"Pommes",          qty:10,  unit:"kg",    alert:2,   cat:"Légumes",  price:2    },
  {id:10, name:"Thym",            qty:20,  unit:"bottes",alert:4,   cat:"Herbes",   price:0.8  },
  // Laitiers
  {id:11, name:"Beurre",          qty:5,   unit:"kg",    alert:1,   cat:"Laitiers", price:9    },
  {id:12, name:"Crème fraîche",   qty:8,   unit:"L",     alert:1.5, cat:"Laitiers", price:3.5  },
  {id:13, name:"Œufs",           qty:80,  unit:"u",     alert:12,  cat:"Laitiers", price:0.3  },
  {id:14, name:"Parmesan",        qty:3,   unit:"kg",    alert:0.5, cat:"Laitiers", price:24   },
  {id:15, name:"Gruyère",         qty:3,   unit:"kg",    alert:0.5, cat:"Laitiers", price:16   },
  // Épicerie
  {id:16, name:"Farine",          qty:10,  unit:"kg",    alert:2,   cat:"Épicerie", price:1    },
  {id:17, name:"Sucre",           qty:6,   unit:"kg",    alert:1,   cat:"Épicerie", price:1.2  },
  {id:18, name:"Riz Arborio",     qty:5,   unit:"kg",    alert:1,   cat:"Épicerie", price:3.5  },
  {id:19, name:"Huile d'olive",   qty:4,   unit:"L",     alert:0.5, cat:"Épicerie", price:7    },
  // Boissons
  {id:20, name:"Vin blanc",       qty:18,  unit:"btl",   alert:4,   cat:"Boissons", price:6    },
  {id:21, name:"Bordeaux",        qty:24,  unit:"btl",   alert:8,   cat:"Boissons", price:12   },
  {id:22, name:"Eau minérale",    qty:48,  unit:"btl",   alert:12,  cat:"Boissons", price:0.5  },
];

/* ─── Menu: each dish defined by recipe of primary elements ─ */
// prepTime: base preparation time in seconds (before chef bonuses)
const MENU0=[
  // ── Entrées ─────────────────────────────────────────────
  {id:1, name:"Salade César",     cat:"Entrées", price:14, prepTime:45,
    ingredients:[
      {stockId:5, qty:1},     // laitue romaine
      {stockId:14,qty:0.06},  // parmesan
      {stockId:13,qty:1},     // œufs (jaune pour sauce)
      {stockId:19,qty:0.04},  // huile d'olive
    ]},
  {id:2, name:"Soupe à l'oignon", cat:"Entrées", price:11, prepTime:90,
    ingredients:[
      {stockId:6, qty:0.35},  // oignons
      {stockId:11,qty:0.05},  // beurre
      {stockId:16,qty:0.02},  // farine
      {stockId:15,qty:0.07},  // gruyère (gratinée)
    ]},
  {id:3, name:"Foie gras maison", cat:"Entrées", price:22, prepTime:60,
    ingredients:[
      {stockId:4, qty:0.12},  // foie gras
      {stockId:11,qty:0.02},  // beurre
      {stockId:17,qty:0.01},  // sucre (chutney)
    ]},
  // ── Plats ───────────────────────────────────────────────
  {id:4, name:"Entrecôte 300g",   cat:"Plats",   price:28, prepTime:75,
    ingredients:[
      {stockId:1, qty:0.35},  // bœuf
      {stockId:11,qty:0.06},  // beurre
      {stockId:8, qty:0.02},  // ail
      {stockId:10,qty:1},     // thym
    ]},
  {id:5, name:"Saumon grillé",    cat:"Plats",   price:24, prepTime:120,
    ingredients:[
      {stockId:2, qty:0.25},  // saumon
      {stockId:11,qty:0.04},  // beurre
      {stockId:19,qty:0.02},  // huile d'olive
      {stockId:8, qty:0.01},  // ail
    ]},
  {id:6, name:"Poulet rôti",      cat:"Plats",   price:19, prepTime:105,
    ingredients:[
      {stockId:3, qty:1},     // poulet
      {stockId:11,qty:0.07},  // beurre
      {stockId:8, qty:0.03},  // ail
      {stockId:10,qty:2},     // thym
    ]},
  {id:7, name:"Risotto champignons",cat:"Plats", price:18, prepTime:180,
    ingredients:[
      {stockId:18,qty:0.15},  // riz arborio
      {stockId:7, qty:0.2},   // champignons
      {stockId:6, qty:0.08},  // oignons
      {stockId:14,qty:0.05},  // parmesan
      {stockId:11,qty:0.04},  // beurre
      {stockId:20,qty:0.15},  // vin blanc
    ]},
  // ── Desserts ────────────────────────────────────────────
  {id:8, name:"Crème brûlée",     cat:"Desserts",price:9,  prepTime:75,
    ingredients:[
      {stockId:12,qty:0.2},   // crème fraîche
      {stockId:13,qty:3},     // œufs
      {stockId:17,qty:0.05},  // sucre
    ]},
  {id:9, name:"Tarte Tatin",      cat:"Desserts",price:10, prepTime:105,
    ingredients:[
      {stockId:9, qty:0.35},  // pommes
      {stockId:11,qty:0.08},  // beurre
      {stockId:17,qty:0.07},  // sucre
      {stockId:16,qty:0.1},   // farine (pâte)
    ]},
  // ── Boissons ────────────────────────────────────────────
  {id:10,name:"Bordeaux 75cl",    cat:"Boissons",price:32, prepTime:8,
    ingredients:[
      {stockId:21,qty:1},     // bordeaux
    ]},
  {id:11,name:"Eau minérale 1L",  cat:"Boissons",price:5,  prepTime:5,
    ingredients:[
      {stockId:22,qty:1},     // eau minérale
    ]},
];
const COMPLAINTS0=[
  {id:1,date:"2026-03-10",table:3,server:"Pierre Martin", type:"Qualité plat",     desc:"Entrecôte trop cuite",            status:"résolu",  prio:"haute"  },
  {id:2,date:"2026-03-11",table:6,server:"Lucas Petit",   type:"Délai service",    desc:"Attente de 40 min pour les entrées",status:"en cours",prio:"moyenne"},
  {id:3,date:"2026-03-11",table:5,server:"Sophie Bernard",type:"Facture incorrecte",desc:"Erreur sur l'addition",           status:"nouveau", prio:"basse"  },
];


/* ─── Gameplay: Random events ─────────────────────────── */
const GAME_EVENTS=[
  {
    id:"inspection", icon:"🔍", title:"Inspection sanitaire",
    desc:"Un inspecteur de la DGCCRF débarque à l'improviste.",
    type:"auto",
    apply:(stock,cash,complaints,addToast,setCash,addTx,setComplaints,setQueue,rMood,rName,rSize,tables,setStock,updateReputation)=>{
      const alerts=stock.filter(s=>s.qty<=s.alert).length;
      if(alerts>=3){
        const fine=300;
        setCash(c=>Math.max(0,c-fine));
        addTx("dépense","Amende inspection sanitaire (infractions stock)",fine);
        setComplaints(p=>[{id:Date.now(),date:new Date().toLocaleDateString("fr-FR"),
          table:"-",server:"-",type:"Inspection",desc:`${alerts} infractions relevées — amende ${fine}€`,
          status:"nouveau",prio:"haute"},...p]);
        addToast({icon:"🚨",title:"Inspection — Amende !",
          msg:`${alerts} infractions · −${fine}€`,color:"#c0392b",tab:"plaintes"});
        updateReputation&&updateReputation(REP_DELTA.inspection,"inspection ratée");
        return "fail";
      } else {
        const bonus=100;
        setCash(c=>c+bonus);
        addTx("revenu","Bonus inspection sanitaire (dossier exemplaire)",bonus);
        addToast({icon:"✅",title:"Inspection réussie !",msg:`Dossier exemplaire · +${bonus}€`,color:"#2a5c3f",tab:"stats"});
        updateReputation&&updateReputation(REP_DELTA.inspOk,"inspection réussie");
        return "pass";
      }
    }
  },
  {
    id:"rush", icon:"⚡", title:"Rush inattendu !",
    desc:"Un groupe important vient de réserver — afflux soudain de clients.",
    type:"auto",
    apply:(stock,cash,complaints,addToast,setCash,addTx,setComplaints,setQueue,rMood,rName,rSize,tables)=>{
      const maxCap=Math.max(...tables.filter(t=>t.status==="libre").map(t=>t.capacity),2);
      const groups=Array.from({length:3},()=>{
        const mood=rMood();
        return{id:Date.now()+Math.random(),name:rName(),
          size:Math.min(rSize(),maxCap),mood,
          expiresAt:Date.now()+mood.p*1500,patMax:mood.p};
      });
      setQueue(q=>[...q,...groups]);
      addToast({icon:"⚡",title:"Rush inattendu !",msg:"3 groupes ajoutés en file d'attente",color:"#b87d10",tab:"tables"});
    }
  },
  {
    id:"frigo", icon:"🧊", title:"Panne de chambre froide !",
    desc:"La chambre froide a lâché cette nuit. Une partie des stocks est perdue.",
    type:"auto",
    apply:(stock,cash,complaints,addToast,setCash,addTx,setComplaints,setQueue,rMood,rName,rSize,tables,setStock)=>{
      setStock(s=>s.map(item=>{
        if(["kg","L"].includes(item.unit)&&["Viandes","Poissons","Laitiers"].includes(item.cat))
          return{...item,qty:+(item.qty*0.4).toFixed(3)};
        return item;
      }));
      addToast({icon:"🧊",title:"Panne frigo !",msg:"Stocks viandes/poissons réduits de 60%",color:"#1c3352",tab:"stock"});
    }
  },
  {
    id:"critique", icon:"✍️", title:"Critique gastronomique",
    desc:"Un critique du Michelin serait en ville ce soir. Une table VIP vient d'arriver.",
    type:"auto",
    apply:(stock,cash,complaints,addToast,setCash,addTx,setComplaints,setQueue,rMood,rName,rSize,tables)=>{
      const vip={id:Date.now()+Math.random(),name:"Guide Michelin",size:2,
        mood:{e:"🎩",l:"VIP",p:60,b:3.0},isVIP:true,
        expiresAt:Date.now()+60000,patMax:60};
      setQueue(q=>[vip,...q]);
      addToast({icon:"🎩",title:"Client VIP !",msg:"Un critique Michelin attend — servez-le vite !",color:"#6b3fa0",tab:"tables"});
    }
  },
];

/* ─── Gameplay: Star rating helper ───────────────────── */
const calcRating=(patienceLeftRatio, moodB)=>{
  // patienceLeftRatio: 1.0 = placed immediately, 0 = placed at last second
  let base = patienceLeftRatio>0.7 ? 5 : patienceLeftRatio>0.45 ? 4 : patienceLeftRatio>0.2 ? 3 : 2;
  if(moodB>=1.5) base=Math.min(5,base+1);
  else if(moodB<0.8) base=Math.max(1,base-1);
  return Math.max(1,Math.min(5,base));
};
const ratingColor=(r)=>r>=4?"#b87d10":r>=3?"#2a5c3f":r>=2?"#c4622d":"#c0392b";
const ratingStars=(r)=>"★".repeat(r)+"☆".repeat(5-r);

/* ─── Système de Réputation ───────────────────────────── */
// 0–100 : démarre à 50. Chaque action positive/négative fait varier la jauge.
const REP_THRESHOLDS = [
  { min:80, label:"Réputé",      icon:"🌟", color:"#6b3fa0", tipMult:1.25, spawnMult:1.20,
    desc:"Les clients affluent. Pourboires +25%, +20% de clients." },
  { min:60, label:"Apprécié",    icon:"😊", color:"#2a5c3f", tipMult:1.10, spawnMult:1.10,
    desc:"Bonne réputation. Légère hausse des pourboires et des clients." },
  { min:40, label:"Neutre",      icon:"😐", color:"#8a7d6a", tipMult:1.00, spawnMult:1.00,
    desc:"Réputation standard, pas d'effet." },
  { min:20, label:"Dégradée",    icon:"😟", color:"#c4622d", tipMult:0.80, spawnMult:0.80,
    desc:"Les clients se méfient. Pourboires −20%, moins de clients." },
  { min:0,  label:"Désastreuse", icon:"💀", color:"#c0392b", tipMult:0.50, spawnMult:0.50,
    desc:"Votre réputation est en ruine. Urgence absolue !" },
];
const getRepTier = (rep) =>
  REP_THRESHOLDS.find(t => rep >= t.min) || REP_THRESHOLDS[REP_THRESHOLDS.length-1];

// Deltas de réputation par événement
const REP_DELTA = {
  rating5    : +4,   // ★★★★★
  rating4    : +2,   // ★★★★
  rating3    :  0,   // ★★★ neutre
  rating2    : -4,   // ★★
  rating1    : -8,   // ★
  vip        : +6,   // Client VIP bien servi
  lostClient : -3,   // Client parti sans être servi
  complaint  : -5,   // Plainte générée auto
  inspection : -6,   // Inspection ratée
  inspOk     : +3,   // Inspection réussie
};


/* ─── Economy: Bank loans ─────────────────────────────── */
const LOAN_OPTIONS=[
  {id:"small",  label:"Petit prêt",    amount:1500, rate:0.06, monthly:90,  icon:"💳"},
  {id:"medium", label:"Prêt standard", amount:4000, rate:0.05, monthly:220, icon:"🏦"},
  {id:"large",  label:"Grand prêt",    amount:9000, rate:0.045,monthly:475, icon:"🏛"},
];

/* ─── Economy: Suppliers ──────────────────────────────── */
const SUPPLIERS={
  standard:{
    id:"standard", name:"Fournisseur Local", icon:"🚚",
    desc:"Prix réduit (−20%) mais livraison en 2 minutes.",
    discount:0.20, delay:120,
  },
  premium:{
    id:"premium", name:"Grossiste Premium", icon:"⚡",
    desc:"Prix plein mais livraison instantanée.",
    discount:0, delay:0,
  },
};

/* ─── Kitchen upgrades ─────────────────────────────────── */
const KITCHEN_UPGRADES=[
  {
    id:"fourneau",    icon:"🔥", name:"Fourneau supplémentaire",
    desc:"Ajoute +1 feu de cuisson simultané.",
    levels:[
      {l:1, cost:600,  bonus:{slots:1}, label:"+1 feu (5 total)"},
      {l:2, cost:1200, bonus:{slots:1}, label:"+1 feu (6 total)"},
      {l:3, cost:2200, bonus:{slots:1}, label:"+1 feu (7 total)"},
    ]
  },
  {
    id:"four",        icon:"🏺", name:"Four professionnel",
    desc:"Réduit le temps de cuisson de tous les plats.",
    levels:[
      {l:1, cost:800,  bonus:{speed:0.15}, label:"−15 % temps de cuisson"},
      {l:2, cost:1800, bonus:{speed:0.15}, label:"−30 % temps de cuisson"},
      {l:3, cost:3500, bonus:{speed:0.20}, label:"−50 % temps de cuisson"},
    ]
  },
  {
    id:"stockage",    icon:"🧊", name:"Chambre froide",
    desc:"Double la capacité maximale de chaque ingrédient en stock.",
    levels:[
      {l:1, cost:1000, bonus:{storage:1}, label:"Capacité stock ×2"},
      {l:2, cost:2500, bonus:{storage:1}, label:"Capacité stock ×3"},
    ]
  },
  {
    id:"plonge",      icon:"🚿", name:"Station de plonge",
    desc:"Réduit le temps de nettoyage des tables.",
    levels:[
      {l:1, cost:500,  bonus:{clean:20}, label:"Nettoyage −20s (40s)"},
      {l:2, cost:1200, bonus:{clean:20}, label:"Nettoyage −20s (20s)"},
    ]
  },
];

const KITCHEN0 = {
  chef: {
    id:1, name:"Julien Marchand", totalXp:0, status:"actif",
    specialty:"Cuisine française", signature:"Entrecôte maison", salary:28,
  },
  commis: [
    { id:1, name:"Léa Fontaine",  totalXp:0,  status:"actif", task:null, salary:10 },
    { id:2, name:"Tom Renard",    totalXp:10, status:"actif", task:null, salary:10 },
    { id:3, name:"Nina Morel",    totalXp:0,  status:"actif", task:null, salary:10 },
  ],
  queue: [],
  cooking: [],
  done: [],
  totalDishes: 0,
  upgrades: {fourneau:0, four:0, stockage:0, plonge:0},
};

/* ─── UI atoms (NO hooks here) ────────────────────────── */
const s = (obj) => obj; // passthrough for style objects

const Badge = ({color,bg,children,sm=false})=>(
  <span style={{background:bg||color+"1a",color,border:`1px solid ${color}33`,
    borderRadius:5,padding:sm?"2px 8px":"3px 11px",
    fontSize:sm?10:11,fontWeight:600,letterSpacing:"0.03em",whiteSpace:"nowrap",fontFamily:F.body}}>
    {children}
  </span>
);

const Card = ({children,style={},onClick,accent})=>(
  <div onClick={onClick} className={onClick?"hovcard":""} style={{
    background:C.card,border:`1.5px solid ${accent||C.border}`,
    borderRadius:14,padding:18,cursor:onClick?"pointer":"default",
    boxShadow:accent?`0 2px 10px ${accent}18`:`0 1px 5px rgba(0,0,0,0.06)`,
    ...style}}>
    {children}
  </div>
);

const Btn = ({children,onClick,v="primary",sm=false,disabled=false,full=false,icon})=>{
  const variants={
    primary: {bg:C.green,    fg:"#fff",  bdr:C.green  },
    secondary:{bg:"transparent",fg:C.green,bdr:C.green },
    terra:   {bg:C.terra,    fg:"#fff",  bdr:C.terra  },
    ghost:   {bg:"transparent",fg:C.muted,bdr:C.border },
    danger:  {bg:C.red,      fg:"#fff",  bdr:C.red    },
    navy:    {bg:C.navy,     fg:"#fff",  bdr:C.navy   },
    disabled: {bg:C.border,    fg:C.muted,  bdr:C.border },
  };
  const vv=variants[v]||variants.primary;
  return(
    <button onClick={onClick} disabled={disabled} style={{
      background:vv.bg,color:vv.fg,border:`1.5px solid ${vv.bdr}`,
      borderRadius:9,padding:sm?"5px 13px":"9px 20px",
      fontSize:sm?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",
      opacity:disabled?0.45:1,fontFamily:F.body,
      width:full?"100%":undefined,
      display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,
      transition:"opacity 0.15s",
    }}>
      {icon&&<span>{icon}</span>}{children}
    </button>
  );
};

const Inp = ({value,onChange,placeholder,style={},type="text"})=>(
  <input value={value} onChange={onChange} placeholder={placeholder} type={type}
    style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,
      padding:"9px 13px",color:C.ink,fontSize:13,fontFamily:F.body,
      outline:"none",width:"100%",boxSizing:"border-box",...style}}/>
);

const Sel = ({value,onChange,children,style={}})=>(
  <select value={value} onChange={onChange}
    style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,
      padding:"9px 13px",color:C.ink,fontSize:13,fontFamily:F.body,
      outline:"none",cursor:"pointer",width:"100%",...style}}>
    {children}
  </select>
);

const Lbl = ({children})=>(
  <div style={{fontSize:11,color:C.muted,fontWeight:600,letterSpacing:"0.06em",
    textTransform:"uppercase",marginBottom:7,fontFamily:F.body}}>
    {children}
  </div>
);

const XpBar = ({xp,needed,color=C.green,h=6})=>(
  <div style={{background:C.border,borderRadius:99,overflow:"hidden",height:h}}>
    <div style={{height:"100%",
      width:`${Math.min(100,(xp/Math.max(1,needed))*100)}%`,
      background:color,borderRadius:99,transition:"width 0.5s ease"}}/>
  </div>
);

const Modal = ({title,onClose,children})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(26,22,18,0.5)",
    zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
      padding:28,width:"100%",maxWidth:540,maxHeight:"88vh",overflowY:"auto",
      boxShadow:"0 20px 60px rgba(0,0,0,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{color:C.ink,margin:0,fontSize:20,fontFamily:F.title,fontWeight:600}}>{title}</h3>
        <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,
          borderRadius:8,color:C.muted,fontSize:20,cursor:"pointer",
          width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Toast system ─────────────────────────────────────── */
function Toasts({list,onDismiss,onNavigate}){
  return(
    <div style={{position:"fixed",top:100,right:18,zIndex:9999,
      display:"flex",flexDirection:"column",gap:8,pointerEvents:"none",width:290}}>
      {list.map(t=>(
        <div key={t.id} onClick={()=>{onDismiss(t.id);if(t.tab&&onNavigate)onNavigate(t.tab);}} style={{background:C.surface,
          border:`1.5px solid ${t.color||C.green}33`,
          borderLeft:`4px solid ${t.color||C.green}`,
          borderRadius:11,overflow:"hidden",
          boxShadow:"0 6px 24px rgba(0,0,0,0.15)",
          pointerEvents:"auto",cursor:t.tab?"pointer":"default",
          animation:"slideIn 0.2s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px"}}>
            <span style={{fontSize:20,lineHeight:1.2,flexShrink:0}}>{t.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:F.body}}>{t.title}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2,fontFamily:F.body}}>{t.msg}</div>
              {t.tab&&<div style={{fontSize:9,color:t.color||C.green,marginTop:3,fontFamily:F.body,fontWeight:600}}>↗ Appuyer pour y aller</div>}
            </div>
            <span style={{fontSize:12,color:C.muted,flexShrink:0,marginTop:1}}>✕</span>
          </div>
          {/* Auto-dismiss countdown bar */}
          <div style={{height:3,background:(t.color||C.green)+"33",overflow:"hidden"}}>
            <div style={{height:"100%",background:t.color||C.green,
              animation:"toastBar 4s linear forwards"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TABLES VIEW
═══════════════════════════════════════════════════════ */
function TablesView({tables,setTables,servers,setServers,menu,setMenu,setKitchen,kitchen,addToast,addRestoXp,cash,setCash,addTx,queue,setQueue,waitlist,setWaitlist,addDayStat,clockNow,onTableUpgrade,setComplaints,dailySpecials,activeEvent,setChallengeProgress,reputation,updateReputation}){
  const [modal,setModal]=useState(null);
  const [tgtT,setTgtT]=useState("");
  const [tgtS,setTgtS]=useState("");
  const [selectedTable,setSelectedTable]=useState(null);
  const [viewMode,setViewMode]=useState("plan"); // "plan" | "grid"

  const [preview,setPreview]=useState([]);
  const now=clockNow; // use App-level clock to avoid reset on tab change

  // Regenerate order preview when table+server both selected
  useEffect(()=>{
    if(modal&&tgtT&&tgtS) setPreview(generateOrderWithSpecials(modal,menu));
    else setPreview([]);
  },[tgtT,tgtS]);

  const activeSrv=servers.filter(s=>s.status==="actif"&&(s.moral??100)>10);
  const freeTbl=(g)=>tables.filter(t=>t.status==="libre"&&t.capacity>=g.size);
  const openAssign=(g)=>{setModal(g);setTgtT("");setTgtS("");setPreview([]);};

  // Direct placement when a free table + active server exist — no modal needed
  const quickPlace=(g)=>{
    const ft=freeTbl(g);
    if(ft.length===0||activeSrv.length===0)return openAssign(g);
    const table=ft[0];
    const srv=activeSrv[0];
    const orderLines=generateOrderWithSpecials(g,menu);
    const tickets=orderLines.flatMap((o,li)=>
      Array.from({length:o.qty},(_,i)=>({
        id:Date.now()+li*100+i+Math.random(),
        name:o.item,cat:o.cat,ingredients:o.ingredients,
        prepTime:o.prepTime||60,
        tableId:table.id,tableName:table.name,
        oid:o.oid,addedAt:Date.now(),
      }))
    );
    // Service duration based on group size: 30s (2p), 60s (4p), 90s (6p)
    // Reduced by speed specialty
    const speedMult=srv.specialty?.id==="speed"?(srv.specialty.speedMult||1.0):1.0;
    const svcDur=Math.round((g.size<=2?30000:g.size<=4?60000:90000)*speedMult);
    const svcLabel=svcDur<=21000?"~20s":svcDur<=42000?"~40s":"~1min";
    const svcUntil=Date.now()+svcDur;
    setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"service",serviceUntil:svcUntil}));
    setTables(p=>p.map(t=>t.id!==table.id?t:
      {...t,status:"occupée",server:srv.name,group:g,order:orderLines,svcTimer:0,svcMax:0,svcUntil,
        placedAt:Date.now(),patienceLeftRatio:Math.max(0,(g.expiresAt-Date.now())/(g.patMax*1000))}));
    setQueue(q=>q.filter(c=>c.id!==g.id));
    // fastPlace challenge: track placements within a session window
    setChallengeProgress(p=>({...p,fastPlace:p.fastPlace+1}));
    addToast({icon:"🛎️",title:"Prise de commande…",
      msg:`${srv.name} prend la commande à ${table.name} · envoi cuisine dans ${svcLabel}`,color:C.navy,tab:"tables"});
    setTimeout(()=>{
      setKitchen(k=>({...k,queue:[...k.queue,...tickets]}));
      setServers(p=>p.map(s=>s.id!==srv.id?s:{...s,status:"actif",serviceUntil:null}));
      setTables(p=>p.map(t=>t.id!==table.id?t:{...t,svcUntil:null,server:null}));
      // Incrémenter orderCount dans le menu
      const counts={};
      orderLines.forEach(o=>{if(o.menuId)counts[o.menuId]=(counts[o.menuId]||0)+o.qty;});
      setMenu(m=>m.map(d=>counts[d.id]?{...d,orderCount:(d.orderCount||0)+counts[d.id]}:d));
      addToast({icon:"📋",title:"Commande en cuisine !",
        msg:`${table.name} · ${tickets.length} plat${tickets.length>1?"s":""}`,color:C.terra,tab:"cuisine"});
    },svcDur);
  };
  // Confirm assignment: generate order, send tickets to kitchen
  const confirm=()=>{
    if(!modal||!tgtT||!tgtS||preview.length===0)return;
    const tid=parseInt(tgtT);
    const tn=tables.find(t=>t.id===tid);
    const orderLines=preview.map(o=>{const d=menu.find(m=>m.id===o.menuId);return d?.isSpecial?{...o,price:d.price,isSpecial:true}:o;}); // apply live specials
    // Build kitchen tickets (one per portion)
    const tickets=orderLines.flatMap((o,li)=>
      Array.from({length:o.qty},(_,i)=>({
        id:Date.now()+li*100+i+Math.random(),
        name:o.item, cat:o.cat, ingredients:o.ingredients,
        prepTime:o.prepTime||60,
        tableId:tid, tableName:tn?.name,
        oid:o.oid, addedAt:Date.now(),
      }))
    );
    setKitchen(k=>({...k,queue:[...k.queue,...tickets]}));
    setTables(p=>p.map(t=>t.id!==tid?t:
      {...t,status:"occupée",server:tgtS,group:modal,order:orderLines,svcTimer:0,svcMax:0,
        placedAt:Date.now(),patienceLeftRatio:Math.max(0,(modal.expiresAt-Date.now())/(modal.patMax*1000))}));
    setQueue(q=>q.filter(c=>c.id!==modal.id));
    // Incrémenter orderCount dans le menu
    const counts={};
    orderLines.forEach(o=>{if(o.menuId)counts[o.menuId]=(counts[o.menuId]||0)+o.qty;});
    setMenu(m=>m.map(d=>counts[d.id]?{...d,orderCount:(d.orderCount||0)+counts[d.id]}:d));
    addToast({icon:"📋",title:"Commande envoyée !",
      msg:`${tn?.name} · ${tickets.length} plat${tickets.length>1?"s":""} → cuisine`,color:C.terra,tab:"cuisine"});
    setModal(null);
  };

  // Encaisser: table is "mange", collect bill + XP
  const checkout=(tid)=>{
    const t=tables.find(x=>x.id===tid);
    if(!t?.group)return;
    const bill=t.order.reduce((s,o)=>s+o.price*o.qty,0);
    const rating=calcRating(t.patienceLeftRatio??0.5, t.group.mood.b);
    const repTier=getRepTier(reputation);
    // Apply server specialty tip multiplier
    const serverObj=servers.find(s=>s.name===t.server);
    const specTipMult=serverObj?.specialty?.tipMult||1.0;
    const tip=+(bill*(rating-1)*0.04*repTier.tipMult*specTipMult).toFixed(2);
    const isVIP=t.group.isVIP||false;
    const totalReceipt=+(bill+tip+(isVIP?200:0)).toFixed(2);
    const xpG=Math.round((20+t.group.size*8)*t.group.mood.b*(isVIP?3:1));

    // Boost server moral on good tip
    if(tip>0&&t.server){
      setServers(prev=>prev.map(s=>s.name!==t.server?s:
        {...s,moral:Math.min(100,(s.moral??100)+Math.min(5,Math.round(tip/2)))}));
    }

    // Réputation : delta selon note
    const repDeltaKey=["","rating1","rating2","rating3","rating4","rating5"][rating];
    updateReputation(REP_DELTA[repDeltaKey]||(rating>=4?2:rating<=2?-4:0), `note ${rating}★`);
    if(isVIP) updateReputation(REP_DELTA.vip,"client VIP servi");

    // Low rating → auto complaint + réputation
    if(rating<=2){
      const desc=rating===1?"Service très insatisfaisant — client très mécontent":"Service insuffisant";
      setComplaints(p=>[{id:Date.now(),date:new Date().toLocaleDateString("fr-FR"),
        table:t.name,server:t.server||"-",type:"Satisfaction",desc,
        status:"nouveau",prio:rating===1?"haute":"moyenne"},...p]);
      updateReputation(REP_DELTA.complaint,"plainte générée");
    }
    // VIP bonus toast
    if(isVIP){
      addToast({icon:"🎩",title:"Critique Michelin servi !",
        msg:`Note ${rating}/5 · Bonus +200€`,color:"#6b3fa0",tab:"tables"});
    }

    // Find a free server for cleaning
    const cleaner=servers.find(s=>s.status==="actif");
    const plongeBonus=(kitchen.upgrades?.plonge||0);
    const cleanSecs=60-plongeBonus*20;
    const cleanDur=cleanSecs*1000;
    const cleanUntil=Date.now()+cleanDur;

    setTables(p=>p.map(x=>x.id!==tid?x:
      {...x,status:"nettoyage",server:cleaner?.name||null,group:null,order:[],
        svcTimer:0,svcMax:0,
        cleanUntil,cleanDur:60}));

    if(cleaner)
      setServers(p=>p.map(s=>s.name!==cleaner.name?s:
        {...s,status:"service",serviceUntil:cleanUntil}));

    const repLabel=repTier.tipMult>1?` · Rep×${repTier.tipMult}`:repTier.tipMult<1?` · Rep×${repTier.tipMult}`:"";
    addToast({icon:"✨",title:`${ratingStars(rating)} +${totalReceipt.toFixed(2)}€`,
      msg:`${t.name} · ${t.group.mood.e}${tip>0?" · pourboire +"+tip.toFixed(2)+"€":""}${repLabel}`,
      color:rating>=4?C.green:rating<=2?C.red:C.amber,tab:"tables"});
    addRestoXp(xpG);
    setCash(c=>+(c+totalReceipt).toFixed(2));
    addTx("revenu",`Table ${t.name} — ${t.group?.name||""} (${t.order.map(o=>`${o.qty}× ${o.item}`).join(", ")})`,totalReceipt);
    addDayStat("served");
    addDayStat("revenue",totalReceipt);
    addDayStat("rating",rating);

    const srvXpGain=15+rating*5;
    if(t.server){
      setServers(prev=>prev.map(s=>s.name!==t.server?s:{...s,totalXp:s.totalXp+srvXpGain}));
    }

    const tip2=+(bill*(rating-1)*0.04).toFixed(2);
    setChallengeProgress(p=>({
      ...p,
      served:p.served+1,
      revenue:+(p.revenue+totalReceipt).toFixed(2),
      highRating:p.highRating+(rating>=4?1:0),
      vip:p.vip+(isVIP?1:0),
      tips:+(p.tips+tip2).toFixed(2),
    }));
  };

  const st={
    libre: tables.filter(t=>t.status==="libre").length,
    occ:   tables.filter(t=>t.status==="occupée").length,
    mange: tables.filter(t=>t.status==="mange").length,
  };
  const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

  // Réorganisation de la file d'attente
  const moveInQueue=(idx,dir)=>{
    setQueue(q=>{
      const next=idx+dir;
      if(next<0||next>=q.length)return q;
      const arr=[...q];
      [arr[idx],arr[next]]=[arr[next],arr[idx]];
      return arr;
    });
  };

  // Temps d'attente estimé : nb de tables occupées × durée moyenne de service restante
  const estimatedWait=(pos)=>{
    const occupiedCount=tables.filter(t=>t.status==="occupée"||t.status==="mange").length;
    const freeCount=tables.filter(t=>t.status==="libre").length;
    if(freeCount>0&&pos===0)return 0;
    // Estimation grossière : chaque position = 90s si pas de table libre
    return Math.max(0,(pos+1-freeCount)*90);
  };

  // Rappel d'un groupe de la liste d'attente (humeur améliorée)
  const recallGroup=(g)=>{
    const boostedMood={...g.mood, p:g.mood.p+15, b:Math.min(3,g.mood.b+0.2)};
    const newGroup={
      ...g,
      mood:boostedMood,
      expiresAt:Date.now()+boostedMood.p*1000,
      patMax:boostedMood.p,
      recalled:true,
    };
    setQueue(q=>[newGroup,...q]);
    setWaitlist(w=>w.filter(x=>x.id!==g.id));
    addToast({icon:"📞",title:`${g.name} rappelé !`,msg:`Humeur améliorée · patience +15s`,color:C.green,tab:"tables"});
  };

  return(
    <div>
      {/* Active event banner */}
      {activeEvent&&(()=>{
        const evt=GAME_EVENTS.find(e=>e.id===activeEvent);
        if(!evt)return null;
        return(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}`,
            borderRadius:12,padding:"10px 16px",marginBottom:14,
            display:"flex",alignItems:"center",gap:10,animation:"pulse 1s ease-in-out"}}>
            <span style={{fontSize:22}}>{evt.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.amber,fontFamily:F.title}}>{evt.title}</div>
              <div style={{fontSize:11,color:C.ink,fontFamily:F.body,marginTop:2}}>{evt.desc}</div>
            </div>
          </div>
        );
      })()}

      {/* Stats row */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"stretch"}}>

        {/* Tables libres */}
        <div style={{flex:"0 0 auto",minWidth:110,background:C.greenP,
          border:`1.5px solid ${C.green}22`,borderRadius:14,padding:"13px 10px",
          textAlign:"center",boxShadow:`0 2px 8px ${C.green}12`}}>
          <div style={{fontSize:11,marginBottom:5}}>✅</div>
          <div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:F.title,lineHeight:1}}>{st.libre}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>Tables libres</div>
        </div>

        {/* File d'attente */}
        <div style={{flex:"0 0 auto",minWidth:110,
          background:queue.length>3?C.redP:C.amberP,
          border:`1.5px solid ${queue.length>3?C.red:C.amber}22`,
          borderRadius:14,padding:"13px 10px",
          textAlign:"center",boxShadow:`0 2px 8px ${queue.length>3?C.red:C.amber}12`}}>
          <div style={{fontSize:11,marginBottom:5}}>🚶</div>
          <div style={{fontSize:22,fontWeight:700,color:queue.length>3?C.red:C.amber,fontFamily:F.title,lineHeight:1}}>{queue.length}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>File d'attente</div>
        </div>

        {/* Nettoyage */}
        {(()=>{const n=tables.filter(t=>t.status==="nettoyage").length;
          return n>0?(
            <div style={{flex:"0 0 auto",minWidth:110,background:C.amberP,
              border:`1.5px solid ${C.amber}22`,borderRadius:14,padding:"13px 10px",
              textAlign:"center",boxShadow:`0 2px 8px ${C.amber}12`}}>
              <div style={{fontSize:11,marginBottom:5}}>🧹</div>
              <div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:F.title,lineHeight:1}}>{n}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4,fontFamily:F.body}}>Nettoyage</div>
            </div>
          ):null;
        })()}

        {/* En cuisine — liste live */}
        <div style={{flex:1,minWidth:220,background:C.terraP,
          border:`1.5px solid ${C.terra}22`,borderRadius:14,padding:"13px 14px",
          boxShadow:`0 2px 8px ${C.terra}12`}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:kitchen.cooking.length>0?10:0}}>
            <span style={{fontSize:14}}>🔥</span>
            <span style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title}}>
              En cuisine ({kitchen.cooking.length})
            </span>
          </div>
          {kitchen.cooking.length===0?(
            <div style={{fontSize:11,color:C.muted,fontStyle:"italic",fontFamily:F.body}}>Aucun plat en cuisson</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {kitchen.cooking.map(d=>{
                const remaining=Math.max(0,Math.ceil((d.startedAt+d.timerMax*1000-now)/1000));
                const pct=d.timerMax>0?Math.min(100,((d.timerMax-remaining)/d.timerMax)*100):0;
                const fmt=s=>s>=60?`${Math.floor(s/60)}m${String(s%60).padStart(2,"0")}s`:s+"s";
                return(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        fontSize:11,fontFamily:F.body,marginBottom:2}}>
                        <span style={{fontWeight:600,color:C.ink,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>
                          {d.name}
                          {d.tableName&&<span style={{color:C.muted,fontWeight:400}}> · {d.tableName}</span>}
                        </span>
                        <span style={{color:C.terra,fontWeight:700,flexShrink:0,marginLeft:6}}>
                          {fmt(remaining)}
                        </span>
                      </div>
                      <div style={{height:4,background:C.terra+"22",borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,
                          background:pct>80?C.green:C.terra,
                          borderRadius:99,transition:"width 0.3s"}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── File d'attente intelligente ── */}
      {(queue.length>0||waitlist.length>0)&&(
        <div style={{marginBottom:20}}>

          {/* Header file */}
          {queue.length>0&&(
            <div style={{background:C.navyP,border:`1.5px solid ${C.navy}22`,
              borderRadius:14,padding:16,marginBottom:waitlist.length>0?12:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span>🚶‍♂️</span>
                <span style={{color:C.navy,fontWeight:700,fontSize:14,fontFamily:F.title}}>
                  {queue.length} groupe{queue.length>1?"s":""} en attente
                </span>
                {queue.length>=5&&(
                  <span style={{fontSize:10,background:C.redP,color:C.red,
                    border:`1px solid ${C.red}33`,borderRadius:20,padding:"2px 8px",
                    fontWeight:700,fontFamily:F.body,animation:"pulse 1.2s infinite"}}>
                    🚨 Salle saturée
                  </span>
                )}
                <span style={{marginLeft:"auto",fontSize:10,color:C.muted,fontFamily:F.body}}>
                  ↑↓ pour réordonner
                </span>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {queue.map((g,idx)=>{
                  const remaining=Math.max(0,Math.ceil((g.expiresAt-now)/1000));
                  const pct=(remaining/g.patMax)*100;
                  const pc=pct>60?C.green:pct>30?C.terra:C.red;
                  const ft=freeTbl(g);
                  const waitSec=estimatedWait(idx);
                  return(
                    <div key={g.id} style={{
                      background:g.recalled?"#f0fff4":g.isVIP?"#fffbef":C.white,
                      border:`1.5px solid ${g.isVIP?"#d4af37":g.recalled?C.green+"55":pc+"33"}`,
                      borderRadius:12,padding:"10px 12px",
                      boxShadow:pct<25?`0 0 10px ${C.red}33`:g.isVIP?"0 0 14px #d4af3744":"none",
                      animation:pct<25?"breatheAmber 1.2s ease-in-out infinite":undefined,
                      display:"flex",alignItems:"center",gap:10}}>

                      {/* Boutons ↑↓ */}
                      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                        <button onClick={()=>moveInQueue(idx,-1)} disabled={idx===0}
                          style={{width:22,height:22,borderRadius:5,border:`1px solid ${C.border}`,
                            background:idx===0?C.bg:C.navyP,color:idx===0?C.muted:C.navy,
                            cursor:idx===0?"not-allowed":"pointer",fontSize:11,fontWeight:700,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>▲</button>
                        <button onClick={()=>moveInQueue(idx,+1)} disabled={idx===queue.length-1}
                          style={{width:22,height:22,borderRadius:5,border:`1px solid ${C.border}`,
                            background:idx===queue.length-1?C.bg:C.navyP,color:idx===queue.length-1?C.muted:C.navy,
                            cursor:idx===queue.length-1?"not-allowed":"pointer",fontSize:11,fontWeight:700,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>▼</button>
                      </div>

                      {/* Position */}
                      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                        background:idx===0?C.green:C.navy,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:800,color:"#fff"}}>
                        {idx+1}
                      </div>

                      {/* Infos groupe */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                          {g.isVIP&&<span style={{fontSize:13}}>🎩</span>}
                          {g.recalled&&<span style={{fontSize:11}}>📞</span>}
                          <span style={{fontSize:13,fontWeight:700,
                            color:g.isVIP?"#8a6a00":C.ink,fontFamily:F.body,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {g.name}
                          </span>
                          <span style={{fontSize:10,background:pct<25?C.redP:pct<60?C.amberP:C.greenP,
                            color:pct<25?C.red:pct<60?C.amber:C.green,
                            borderRadius:4,padding:"0px 5px",fontWeight:600,flexShrink:0}}>
                            {g.mood.e} {g.size}p
                          </span>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                          <div style={{flex:1,height:4,background:C.border,borderRadius:99,overflow:"hidden",minWidth:40}}>
                            <div style={{height:"100%",borderRadius:99,
                              background:`linear-gradient(90deg,${C.red},${pct>50?C.amber:C.red},${pct>70?C.green:C.red})`,
                              width:`${pct}%`,transition:"width 0.5s linear"}}/>
                          </div>
                          <span style={{fontSize:10,color:pc,fontWeight:700,fontFamily:F.body,flexShrink:0}}>
                            {remaining}s
                          </span>
                          {waitSec>0&&(
                            <span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                              ⏳ ~{waitSec>=60?`${Math.floor(waitSec/60)}min`:waitSec+"s"} att.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bouton placer */}
                      <Btn sm v={ft.length>0?"primary":"ghost"}
                        disabled={ft.length===0}
                        onClick={()=>ft.length>0&&activeSrv.length>0?quickPlace(g):openAssign(g)}>
                        {ft.length>0
                          ?activeSrv.length>0?"▶ Placer":"Pas de serveur"
                          :"Complet"
                        }
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liste d'attente (groupes partis rappelables) */}
          {waitlist.length>0&&(
            <div style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,
              borderRadius:14,padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:15}}>📞</span>
                <span style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title}}>
                  {waitlist.length} groupe{waitlist.length>1?"s":""} — rappelable{waitlist.length>1?"s":""}
                </span>
                <span style={{fontSize:10,color:C.muted,fontFamily:F.body,marginLeft:"auto"}}>
                  Sous 2 minutes · humeur améliorée
                </span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {waitlist.map(g=>{
                  const recallLeft=Math.max(0,Math.ceil((g.recallUntil-now)/1000));
                  const pct=(recallLeft/120)*100;
                  return(
                    <div key={g.id} style={{
                      background:C.surface,border:`1.5px solid ${C.terra}44`,
                      borderRadius:10,padding:"10px 12px",minWidth:160,flex:"0 0 auto"}}>
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"center",marginBottom:6}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                          {g.mood.e} {g.name}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:C.terra,fontFamily:F.title}}>
                          {recallLeft}s
                        </span>
                      </div>
                      <div style={{height:3,background:C.border,borderRadius:99,
                        overflow:"hidden",marginBottom:8}}>
                        <div style={{height:"100%",width:`${pct}%`,background:C.terra,
                          borderRadius:99,transition:"width 0.5s"}}/>
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>
                        👥 {g.size}p · {g.mood.l}
                      </div>
                      <Btn sm full v="terra" onClick={()=>recallGroup(g)}>
                        📞 Rappeler
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bouton toggle vue ── */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
        {[{k:"plan",icon:"🗺",label:"Plan de salle"},{k:"grid",icon:"⊞",label:"Grille"}].map(v=>(
          <button key={v.k} onClick={()=>setViewMode(v.k)} style={{
            padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
            background:viewMode===v.k?C.navy:"transparent",
            color:viewMode===v.k?"#fff":C.muted,
            border:`1.5px solid ${viewMode===v.k?C.navy:C.border}`,
            cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:5}}>
            <span>{v.icon}</span><span>{v.label}</span>
          </button>
        ))}
        {selectedTable&&viewMode==="plan"&&(
          <button onClick={()=>setSelectedTable(null)}
            style={{marginLeft:"auto",padding:"4px 10px",borderRadius:7,fontSize:11,
              background:C.redP,color:C.red,border:`1px solid ${C.red}33`,
              cursor:"pointer",fontFamily:F.body,fontWeight:600}}>
            ✕ Fermer
          </button>
        )}
      </div>

      {viewMode==="plan"?(
        /* ══════════════════════════════════════════════════
           PLAN DE SALLE SVG
        ══════════════════════════════════════════════════ */
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>

          {/* SVG Floor plan */}
          <div style={{flex:"1 1 420px",background:"#faf7f0",
            border:`1.5px solid ${C.border}`,borderRadius:16,
            overflow:"hidden",position:"relative",minHeight:340}}>

            {/* Légende */}
            <div style={{position:"absolute",top:10,left:10,zIndex:5,
              display:"flex",gap:6,flexWrap:"wrap"}}>
              {[
                {c:C.green,   label:"Libre"},
                {c:C.terra,   label:"En cuisine"},
                {c:"#2a7a5c", label:"Repas"},
                {c:C.amber,   label:"Nettoyage"},
                {c:C.navy,    label:"Commande"},
              ].map(x=>(
                <div key={x.label} style={{display:"flex",alignItems:"center",gap:4,
                  background:"rgba(255,255,255,0.85)",borderRadius:5,padding:"2px 7px",
                  fontSize:9,fontFamily:F.body,fontWeight:600,color:x.c,
                  border:`1px solid ${x.c}33`}}>
                  <div style={{width:7,height:7,borderRadius:2,background:x.c}}/>
                  {x.label}
                </div>
              ))}
            </div>

            {/* SVG Floor plan — layout dynamique */}
            {(()=>{
              const n = tables.length;

              // ── 1. Grille dynamique ─────────────────────────
              // Colonnes : adapté au nombre de tables
              const cols = n<=2?n : n<=4?2 : n<=6?3 : n<=9?3 : 4;
              const rows = Math.ceil(n / cols);

              // ── 2. Taille de chaque cellule ─────────────────
              // La plus grande table (6p) : tw=64, th=46
              // Chaises : +14px gauche/droite, +14px haut/bas
              // Espacement entre tables : 20px
              const CELL_W = 110; // 64+14+14+18 de marge
              const CELL_H = 90;  // 46+14+14+16 de marge

              // ── 3. Marges du plan ───────────────────────────
              const ML = 30;   // gauche (couloir cuisine)
              const MT = 52;   // haut (déco + espace)
              const MR = 80;   // droite (bar)
              const MB = 36;   // bas (entrée)

              // ── 4. ViewBox calculée ──────────────────────────
              const VW = ML + cols * CELL_W + MR;
              const VH = MT + rows * CELL_H + MB;

              // ── 5. Position centre de chaque table ──────────
              const getPos = (i) => ({
                cx: ML + (i % cols) * CELL_W + CELL_W / 2,
                cy: MT + Math.floor(i / cols) * CELL_H + CELL_H / 2,
              });

              return(
                <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block"}}>
                  {/* Fond parquet */}
                  <rect x="0" y="0" width={VW} height={VH} fill="#faf7f0"/>
                  {Array.from({length:Math.ceil(VH/20)+1},(_,i)=>(
                    <line key={`h${i}`} x1="0" y1={i*20} x2={VW} y2={i*20}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}
                  {Array.from({length:Math.ceil(VW/20)+1},(_,i)=>(
                    <line key={`v${i}`} x1={i*20} y1="0" x2={i*20} y2={VH}
                      stroke="#e8e0d0" strokeWidth="0.5"/>
                  ))}

                  {/* Entrée — centrée en bas */}
                  <rect x={VW/2-50} y={VH-20} width={100} height={20} rx="4"
                    fill="#d4c9b0" opacity="0.8"/>
                  <text x={VW/2} y={VH-8} textAnchor="middle" fontSize="9"
                    fill="#8a7d6a" fontFamily="sans-serif">✦ ENTRÉE</text>

                  {/* Bar — droite */}
                  <rect x={VW-MR+6} y={MT} width={MR-10} height={Math.min(rows*CELL_H, 50)} rx="6"
                    fill="#c4a882" opacity="0.7"/>
                  <text x={VW-MR+MR/2+1} y={MT+18} textAnchor="middle" fontSize="9"
                    fill="#5a3e20" fontFamily="sans-serif">🍺</text>
                  <text x={VW-MR+MR/2+1} y={MT+30} textAnchor="middle" fontSize="8"
                    fill="#5a3e20" fontFamily="sans-serif">Bar</text>

                  {/* Cuisine — gauche */}
                  <rect x={2} y={MT} width={ML-4} height={30} rx="4"
                    fill="#b8d4c8" opacity="0.8"/>
                  <text x={ML/2} y={MT+12} textAnchor="middle" fontSize="8"
                    fill="#2a5c3f" fontFamily="sans-serif">🍳</text>
                  <text x={ML/2} y={MT+23} textAnchor="middle" fontSize="7"
                    fill="#2a5c3f" fontFamily="sans-serif">Cuisine</text>

                  {/* Tables */}
                  {tables.map((t,i)=>{
                    const pos = getPos(i);
                    const isMange=t.status==="mange";
                    const isNettoyage=t.status==="nettoyage";
                    const isOrdering=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
                    const isLibre=t.status==="libre";
                    const myQ=queue.filter(g=>g.size<=t.capacity&&isLibre);

                    const fill=isNettoyage?"#f5d878":isMange?"#4a9e78":isOrdering?"#3a5f8a":
                      t.status==="occupée"?"#e07a45":myQ.length>0?"#5ab88a":"#c8e6d8";

                    const stroke=t.id===selectedTable?.id?"#1a1612":
                      t.group?.isVIP?"#d4af37":fill;
                    const strokeW=t.id===selectedTable?.id?3:1.5;

                    // Taille selon capacité — garantit que tw+chaises < CELL_W
                    const tw=t.capacity<=2?40:t.capacity<=4?50:60;
                    const th=t.capacity<=2?32:t.capacity<=4?38:44;

                    const bill=isMange?t.order.reduce((s,o)=>s+o.price*o.qty,0):0;
                    const isEating=isMange&&t.eatUntil&&now<t.eatUntil;
                    const eatPct=isEating?
                      Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):
                      isMange?100:0;

                    return(
                      <g key={t.id} onClick={()=>setSelectedTable(t)} style={{cursor:"pointer"}}>

                        {/* Halo sélection */}
                        {t.id===selectedTable?.id&&(
                          <rect x={pos.cx-tw/2-7} y={pos.cy-th/2-7}
                            width={tw+14} height={th+14} rx="13"
                            fill="none" stroke="#1a1612" strokeWidth="2.5"
                            opacity="0.25" strokeDasharray="5 3"/>
                        )}

                        {/* Chaises latérales */}
                        {[{dx:-(tw/2+7),dy:0},{dx:tw/2+7,dy:0}].map((ch,ci)=>(
                          <ellipse key={`s${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="5" ry="7" fill="#d4c9b0" opacity="0.75"/>
                        ))}
                        {/* Chaises haut/bas si 4p+ */}
                        {t.capacity>=4&&[{dx:0,dy:-(th/2+7)},{dx:0,dy:th/2+7}].map((ch,ci)=>(
                          <ellipse key={`tb${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="7" ry="5" fill="#d4c9b0" opacity="0.75"/>
                        ))}
                        {/* Chaises supplémentaires si 6p */}
                        {t.capacity>=6&&[
                          {dx:-(tw/2+7),dy:-th/4},{dx:-(tw/2+7),dy:th/4},
                          {dx:tw/2+7,     dy:-th/4},{dx:tw/2+7,     dy:th/4},
                        ].map((ch,ci)=>(
                          <ellipse key={`ex${ci}`}
                            cx={pos.cx+ch.dx} cy={pos.cy+ch.dy}
                            rx="4" ry="6" fill="#d4c9b0" opacity="0.65"/>
                        ))}

                        {/* Surface de la table */}
                        <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                          width={tw} height={th} rx="8"
                          fill={fill} stroke={stroke} strokeWidth={strokeW}
                          opacity={isLibre&&myQ.length===0?0.85:1}/>

                        {/* Barre de progression (repas / nettoyage) */}
                        {(isMange||isNettoyage)&&(
                          <g>
                            <rect x={pos.cx-tw/2+4} y={pos.cy+th/2-7}
                              width={tw-8} height={4} rx="2" fill="rgba(0,0,0,0.18)"/>
                            <rect x={pos.cx-tw/2+4} y={pos.cy+th/2-7}
                              width={Math.max(0,(tw-8)*eatPct/100)} height={4} rx="2"
                              fill="rgba(255,255,255,0.75)"/>
                          </g>
                        )}

                        {/* Numéro */}
                        <text x={pos.cx} y={pos.cy-3}
                          textAnchor="middle"
                          fontSize={cols<=3?12:10} fontWeight="700"
                          fill={isLibre&&myQ.length===0?"#2a5c3f":"white"}
                          fontFamily="Georgia,serif">
                          {t.name.replace("Table ","")}
                        </text>

                        {/* Icône statut + couverts */}
                        <text x={pos.cx} y={pos.cy+10}
                          textAnchor="middle"
                          fontSize={cols<=3?9:8}
                          fill={isLibre&&myQ.length===0?"#4a7c5f":"rgba(255,255,255,0.9)"}
                          fontFamily="sans-serif">
                          {isNettoyage?"🧹":isMange&&isEating?"🍴":isMange?"💰":
                            isOrdering?"🛎":t.status==="occupée"?"🔥":
                            myQ.length>0?"👥":"✓"} {t.capacity}p
                        </text>

                        {/* Badge montant prêt à encaisser */}
                        {isMange&&!isEating&&(
                          <g>
                            <rect x={pos.cx-19} y={pos.cy-th/2-16}
                              width={38} height={14} rx="7" fill={C.green} opacity="0.95"/>
                            <text x={pos.cx} y={pos.cy-th/2-6}
                              textAnchor="middle" fontSize="8" fontWeight="800"
                              fill="white" fontFamily="sans-serif">
                              💰{bill.toFixed(0)}€
                            </text>
                          </g>
                        )}

                        {/* Badge VIP */}
                        {t.group?.isVIP&&(
                          <text x={pos.cx+tw/2-5} y={pos.cy-th/2+10}
                            textAnchor="middle" fontSize="10">🎩</text>
                        )}

                        {/* Pulse attente client */}
                        {isLibre&&myQ.length>0&&(
                          <rect x={pos.cx-tw/2} y={pos.cy-th/2}
                            width={tw} height={th} rx="8"
                            fill="none" stroke={C.green} strokeWidth="2.5"
                            opacity="0.7">
                            <animate attributeName="opacity"
                              values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite"/>
                          </rect>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* Panneau de détail latéral */}
          <div style={{width:260,flexShrink:0,minWidth:220}}>
            {selectedTable?(()=>{
              const t=selectedTable;
              // Refresh from live tables
              const tLive=tables.find(x=>x.id===t.id)||t;
              const isMange=tLive.status==="mange";
              const isNettoyage=tLive.status==="nettoyage";
              const isOrdering=tLive.status==="occupée"&&tLive.svcUntil&&now<tLive.svcUntil;
              const bill=isMange?tLive.order.reduce((s,o)=>s+o.price*o.qty,0):0;
              const isEating=isMange&&tLive.eatUntil&&now<tLive.eatUntil;
              const eatSecsLeft=isEating?Math.ceil((tLive.eatUntil-now)/1000):0;
              const cleanSecsLeft=isNettoyage&&tLive.cleanUntil?Math.max(0,Math.ceil((tLive.cleanUntil-now)/1000)):0;
              const cleanPct=isNettoyage&&tLive.cleanUntil?Math.min(100,Math.round(((tLive.cleanDur*1000-(tLive.cleanUntil-now))/(tLive.cleanDur*1000))*100)):0;
              const eatPct=isEating?Math.min(100,Math.round(((tLive.eatDur*1000-(tLive.eatUntil-now))/(tLive.eatDur*1000))*100)):100;
              const secsLeft=isOrdering?Math.max(0,Math.ceil((tLive.svcUntil-now)/1000)):0;
              const myQ=queue.filter(g=>g.size<=tLive.capacity&&tLive.status==="libre");
              const accentColor=isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:tLive.status==="occupée"?C.terra:C.green;

              return(
                <div style={{background:C.surface,border:`1.5px solid ${accentColor}44`,
                  borderRadius:16,overflow:"hidden",
                  boxShadow:`0 4px 20px ${accentColor}18`}}>

                  {/* Header */}
                  <div style={{background:`linear-gradient(135deg,${accentColor}18,${accentColor}08)`,
                    padding:"14px 16px",borderBottom:`1px solid ${accentColor}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:18,fontWeight:800,color:C.ink,fontFamily:F.title}}>
                          {tLive.name}
                          {tLive.group?.isVIP&&<span style={{marginLeft:6}}>🎩</span>}
                        </div>
                        <div style={{fontSize:11,color:accentColor,fontWeight:600,
                          fontFamily:F.body,marginTop:3}}>
                          {isNettoyage?"🧹 Nettoyage":isMange&&isEating?"🍴 Repas en cours":
                            isMange?"💰 Prêt à encaisser":isOrdering?"🛎 Prise de commande":
                            tLive.status==="occupée"?"🔥 En cuisine":"✅ Libre"}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:22,fontWeight:800,color:accentColor,fontFamily:F.title}}>
                          {tLive.capacity}
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>couverts</div>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>

                    {/* Groupe */}
                    {tLive.group&&(
                      <div style={{background:C.bg,borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,marginBottom:3}}>
                          {tLive.group.mood.e} {tLive.group.name}
                        </div>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                          👥 {tLive.group.size}p · {tLive.group.mood.l}
                          {tLive.server&&<span> · 👔 {tLive.server}</span>}
                        </div>
                      </div>
                    )}

                    {/* Commande */}
                    {(tLive.order||[]).length>0&&(
                      <div>
                        <div style={{fontSize:10,color:C.muted,fontWeight:600,
                          textTransform:"uppercase",letterSpacing:"0.06em",
                          fontFamily:F.body,marginBottom:5}}>Commande</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {tLive.order.map((o,i)=>(
                            <span key={i} style={{fontSize:10,
                              background:o.isSpecial?C.purpleP:C.terraP,
                              color:o.isSpecial?C.purple:C.terra,
                              borderRadius:5,padding:"2px 6px",fontFamily:F.body}}>
                              {o.qty}× {o.item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progressions */}
                    {isEating&&(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",
                          fontSize:11,fontFamily:F.body,marginBottom:4}}>
                          <span style={{color:C.green,fontWeight:600}}>🍴 Repas</span>
                          <span style={{color:C.muted}}>
                            {Math.floor(eatSecsLeft/60)}:{String(eatSecsLeft%60).padStart(2,"0")}
                          </span>
                        </div>
                        <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${eatPct}%`,
                            background:`linear-gradient(90deg,${C.green},${C.amber})`,
                            borderRadius:99,transition:"width 0.5s"}}/>
                        </div>
                      </div>
                    )}

                    {isNettoyage&&(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",
                          fontSize:11,fontFamily:F.body,marginBottom:4}}>
                          <span style={{color:C.amber,fontWeight:600}}>🧹 Nettoyage</span>
                          <span style={{color:C.muted}}>
                            {Math.floor(cleanSecsLeft/60)}:{String(cleanSecsLeft%60).padStart(2,"0")}
                          </span>
                        </div>
                        <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${cleanPct}%`,
                            background:`linear-gradient(90deg,${C.amber},${C.green})`,
                            borderRadius:99,transition:"width 0.5s"}}/>
                        </div>
                      </div>
                    )}

                    {isOrdering&&(
                      <div style={{background:C.navyP,borderRadius:8,padding:"8px 12px",
                        textAlign:"center"}}>
                        <div style={{fontSize:12,fontWeight:800,color:C.navy,fontFamily:F.title}}>
                          🛎 Prise de commande
                        </div>
                        <div style={{fontSize:10,color:C.navy,opacity:0.7,fontFamily:F.body,marginTop:2}}>
                          Envoi cuisine dans {secsLeft}s
                        </div>
                      </div>
                    )}

                    {/* Note prévisionnelle */}
                    {isMange&&tLive.group&&(()=>{
                      const r=calcRating(tLive.patienceLeftRatio??0.5,tLive.group.mood.b);
                      const rc=ratingColor(r);
                      return(
                        <div style={{background:rc+"11",border:`1px solid ${rc}33`,
                          borderRadius:8,padding:"7px 10px",
                          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:14,color:rc,letterSpacing:"2px"}}>{ratingStars(r)}</span>
                          <span style={{fontSize:11,color:rc,fontWeight:700,fontFamily:F.body}}>
                            {bill.toFixed(2)}€
                          </span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    <div style={{display:"flex",flexDirection:"column",gap:6,paddingTop:4}}>

                      {/* Encaisser */}
                      {isMange&&(
                        <Btn full v={isEating?"disabled":"primary"}
                          onClick={isEating?null:()=>{checkout(tLive.id);setSelectedTable(null);}}
                          icon={isEating?"⏳":"💰"}>
                          {isEating?"Patienter…":`Encaisser ${bill.toFixed(2)}€`}
                        </Btn>
                      )}

                      {/* Placer un groupe */}
                      {tLive.status==="libre"&&(
                        <>
                          {myQ.length>0?(
                            <Sel value="" style={{fontSize:11,padding:"6px 10px"}}
                              onChange={e=>{
                                const id=parseFloat(e.target.value);
                                const g=queue.find(x=>x.id===id);
                                if(g){activeSrv.length>0?quickPlace(g):openAssign(g);}
                              }}>
                              <option value="">↳ Placer un groupe…</option>
                              {myQ.map(g=>(
                                <option key={g.id} value={g.id}>
                                  {g.mood.e} {g.name} ({g.size}p)
                                </option>
                              ))}
                            </Sel>
                          ):(
                            <div style={{fontSize:11,color:C.muted,fontStyle:"italic",
                              fontFamily:F.body,textAlign:"center",padding:"6px 0"}}>
                              Aucun groupe compatible en attente
                            </div>
                          )}
                        </>
                      )}

                      {/* Agrandir table */}
                      {tLive.status==="libre"&&tLive.capLv<2&&(()=>{
                        const up=CAP_UPGRADES[tLive.capLv];
                        const canAfford=cash>=up.cost;
                        return(
                          <Btn sm v={canAfford?"navy":"disabled"} disabled={!canAfford}
                            onClick={()=>{
                              if(!canAfford)return;
                              setTables(p=>p.map(x=>x.id!==tLive.id?x:{...x,capacity:up.newCap,capLv:tLive.capLv+1}));
                              setCash(c=>+(c-up.cost).toFixed(2));
                              addTx("achat",`Agrandissement ${tLive.name} → ${up.newCap} couverts`,up.cost);
                              addToast({icon:"🪑",title:"Table agrandie !",msg:`${tLive.name} passe à ${up.newCap} couverts`,color:C.navy,tab:"tables"});
                              if(onTableUpgrade)onTableUpgrade();
                            }}>
                            🪑 {up.label} — {up.cost}€
                          </Btn>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })():(
              <div style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                borderRadius:16,padding:24,textAlign:"center",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:10,minHeight:200}}>
                <span style={{fontSize:32,opacity:0.4}}>🍽</span>
                <div style={{fontSize:13,color:C.muted,fontFamily:F.body}}>
                  Cliquez sur une table pour voir ses détails
                </div>
              </div>
            )}
          </div>
        </div>
      ):(
        /* ══════════════════════════════════════════════════
           VUE GRILLE (ancienne vue conservée)
        ══════════════════════════════════════════════════ */
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {tables.map(t=>{

            const isMange=t.status==="mange";
            const isNettoyage=t.status==="nettoyage";
            const bill=isMange?t.order.reduce((s,o)=>s+o.price*o.qty,0):0;
            const isEating=isMange&&t.eatUntil&&now<t.eatUntil;
            const eatPct=isEating?Math.min(100,Math.round(((t.eatDur*1000-(t.eatUntil-now))/(t.eatDur*1000))*100)):100;
            const eatSecsLeft=isEating?Math.ceil((t.eatUntil-now)/1000):0;
            const cleanPct=isNettoyage&&t.cleanUntil?Math.min(100,Math.round(((t.cleanDur*1000-(t.cleanUntil-now))/(t.cleanDur*1000))*100)):0;
            const cleanSecsLeft=isNettoyage&&t.cleanUntil?Math.max(0,Math.ceil((t.cleanUntil-now)/1000)):0;
            const myQ=queue.filter(g=>g.size<=t.capacity&&t.status==="libre");
            const srvObj=servers.find(s=>s.name===t.server);
            const isOrdering=t.status==="occupée"&&t.svcUntil&&now<t.svcUntil;
            const secsLeft=isOrdering?Math.max(0,Math.ceil((t.svcUntil-now)/1000)):0;
            const accentColor=isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:t.status==="occupée"?C.terra:C.muted;

            return(
              <div key={t.id} style={{
                background:isNettoyage?C.amberP:isMange?C.greenP:isOrdering?C.navyP:t.status==="occupée"?C.terraP:C.card,
                border:`1.5px solid ${t.group?.isVIP?"#d4af37":accentColor+"44"}`,
                borderRadius:14,padding:16,paddingLeft:22,position:"relative",
                boxShadow:t.group?.isVIP?"0 0 20px #d4af3755":isMange?`0 0 16px ${C.green}33`:isNettoyage?`0 0 14px ${C.amber}33`:`0 1px 5px rgba(0,0,0,0.07)`,
                transition:"all 0.3s ease",
                animation:t.status==="libre"&&myQ.length>0?"breathe 2.4s ease-in-out infinite":undefined,
              }}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,
                  borderRadius:"14px 0 0 14px",
                  background:t.group?.isVIP?"linear-gradient(180deg,#d4af37,#f5d878,#d4af37)":
                    isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:
                    t.status==="occupée"?C.terra:myQ.length>0?C.green:C.muted+"44",
                  animation:isOrdering?"ledPulse 1.2s ease-in-out infinite":
                    isMange&&isEating?"ledPulse 2s ease-in-out infinite":undefined,
                }}/>
                {t.group?.isVIP&&(
                  <div style={{position:"absolute",top:8,right:8,fontSize:18}}>🎩</div>
                )}
                {t.status==="libre"&&t.capLv<2&&(()=>{
                  const up=CAP_UPGRADES[t.capLv];
                  const canAfford=cash>=up.cost;
                  return(
                    <button onClick={(e)=>{
                      e.stopPropagation();
                      if(!canAfford)return;
                      setTables(p=>p.map(x=>x.id!==t.id?x:{...x,capacity:up.newCap,capLv:t.capLv+1}));
                      setCash(c=>+(c-up.cost).toFixed(2));
                      addTx("achat",`Agrandissement ${t.name} → ${up.newCap} couverts`,up.cost);
                      addToast({icon:"🪑",title:"Table agrandie !",msg:`${t.name} passe à ${up.newCap} couverts`,color:C.navy,tab:"tables"});
                      if(onTableUpgrade)onTableUpgrade();
                    }} title={`${up.label} — ${up.cost}€`} style={{
                      position:"absolute",top:10,right:10,
                      background:canAfford?C.navyP:"transparent",
                      border:`1.5px solid ${canAfford?C.navy:C.border}`,
                      borderRadius:7,padding:"3px 8px",cursor:canAfford?"pointer":"not-allowed",
                      opacity:canAfford?1:0.45,fontFamily:F.body,
                      display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:10}}>🪑</span>
                      <span style={{fontSize:10,color:canAfford?C.navy:C.muted,fontWeight:600}}>Amélioration · {up.cost}€</span>
                    </button>
                  );
                })()}
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:C.ink,fontFamily:F.title,marginBottom:5}}>
                    {t.name}
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                    <Badge
                      color={t.status==="libre"?C.green:isNettoyage?C.amber:isMange?C.green:isOrdering?C.navy:C.terra}
                      bg={t.status==="libre"?C.greenP:isNettoyage?C.amberP:isMange?C.greenP:isOrdering?C.navyP:C.terraP} sm>
                      {t.status==="libre"?"libre":isNettoyage?"🧹 nettoyage":isMange?(isEating?"🍴 repas en cours":"🍽 repas"):isOrdering?"🛎 prise de commande":"🔥 en cuisine"}
                    </Badge>
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>👥 {t.capacity} couverts</div>
                  {t.status==="libre"&&t.freedAt&&(
                    <div style={{fontSize:10,color:C.green,fontWeight:600,fontFamily:F.body,marginTop:3}}>
                      ✓ Libre depuis {new Date(t.freedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  )}
                </div>
                {t.status==="occupée"&&(
                  <div style={{borderTop:`1px solid ${isOrdering?C.navy:C.terra}22`,paddingTop:10,marginTop:6}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:8,fontFamily:F.body,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>{t.group?.mood.e} {t.group?.name} · {t.group?.size}p</span>
                      {t.server&&<span>👔 {t.server}</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                      {t.order.map((o,i)=>(
                        <span key={i} style={{fontSize:10,
                          background:o.isSpecial?C.purpleP:C.terraP,
                          color:o.isSpecial?C.purple:C.terra,
                          borderRadius:5,padding:"2px 7px",fontFamily:F.body}}>
                          {o.isSpecial?"✨ ":""}{o.qty}× {o.item}
                        </span>
                      ))}
                    </div>
                    {isOrdering?(
                      <div style={{background:C.navyP,border:`1.5px solid ${C.navy}33`,
                        borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                        <div style={{fontSize:14,fontWeight:800,color:C.navy,fontFamily:F.title,marginBottom:4}}>
                          🛎 PRISE DE COMMANDE
                        </div>
                        <div style={{fontSize:12,color:C.navy,fontFamily:F.body,opacity:0.8}}>
                          Envoi cuisine dans <strong>{secsLeft}s</strong>
                        </div>
                      </div>
                    ):(
                      <div style={{fontSize:12,color:C.terra,fontWeight:600,fontFamily:F.body}}>
                        🔥 Commande en cuisine…
                      </div>
                    )}
                  </div>
                )}
                {isMange&&(
                  <div style={{borderTop:`1px solid ${C.green}33`,paddingTop:10,marginTop:6}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                      {t.group?.mood.e} {t.group?.name} · 👔 {t.server}
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:10,fontFamily:F.body}}>
                      {t.order.map(o=>`${o.qty}× ${o.item}`).join(", ")}
                    </div>
                    {isEating&&(
                      <div style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                          <span style={{fontSize:11,color:C.green,fontWeight:600,fontFamily:F.body}}>🍴 En train de manger…</span>
                          <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                            {Math.floor(eatSecsLeft/60)}:{String(eatSecsLeft%60).padStart(2,"0")}
                          </span>
                        </div>
                        <div style={{background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
                          <div style={{width:`${eatPct}%`,height:"100%",
                            background:`linear-gradient(90deg,${C.green},${C.amber})`,
                            borderRadius:99,transition:"width 0.5s linear"}}/>
                        </div>
                      </div>
                    )}
                    {(()=>{
                      const r=calcRating(t.patienceLeftRatio??0.5,t.group.mood.b);
                      const tip=+(bill*(r-1)*0.04).toFixed(2);
                      const rc=ratingColor(r);
                      return(
                        <div style={{background:rc+"11",border:`1px solid ${rc}33`,
                          borderRadius:8,padding:"6px 10px",marginBottom:10,
                          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:13,color:rc,letterSpacing:"1px"}}>{ratingStars(r)}</span>
                          <span style={{fontSize:11,color:rc,fontWeight:600,fontFamily:F.body}}>
                            {tip>0?`+${tip.toFixed(2)}€ pourboire`:"Pas de pourboire"}
                          </span>
                        </div>
                      );
                    })()}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Addition</span>
                      <span style={{fontSize:22,fontWeight:700,color:C.terra,fontFamily:F.title}}>{bill.toFixed(2)}€</span>
                    </div>
                    <Btn full v={isEating?"disabled":"primary"} onClick={isEating?null:()=>checkout(t.id)} icon={isEating?"⏳":"💰"}>
                      {isEating?"Patienter…":"Encaisser"}
                    </Btn>
                  </div>
                )}
                {isNettoyage&&(
                  <div style={{borderTop:`1px solid ${C.amber}33`,paddingTop:10,marginTop:6}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:8,fontFamily:F.body}}>
                      🧹 {t.server||"Serveur"} nettoie la table…
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:11,color:C.amber,fontWeight:600,fontFamily:F.body}}>Nettoyage en cours</span>
                      <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                        {Math.floor(cleanSecsLeft/60)}:{String(cleanSecsLeft%60).padStart(2,"0")}
                      </span>
                    </div>
                    <div style={{background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
                      <div style={{width:`${cleanPct}%`,height:"100%",
                        background:`linear-gradient(90deg,${C.amber},${C.green})`,
                        borderRadius:99,transition:"width 0.5s linear"}}/>
                    </div>
                  </div>
                )}
                {t.status==="libre"&&myQ.length>0&&(
                  <div style={{marginTop:10}}>
                    <Sel value="" style={{fontSize:11,padding:"6px 10px"}}
                      onChange={e=>{
                        const id=parseFloat(e.target.value);
                        const g=queue.find(x=>x.id===id);
                        if(g)openAssign(g);
                      }}>
                      <option value="">↳ Assigner un groupe…</option>
                      {myQ.map(g=>(
                        <option key={g.id} value={g.id}>
                          {g.mood.e} {g.name} ({g.size}p)
                        </option>
                      ))}
                    </Sel>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign modal */}
      {modal&&(
        <Modal title="Placer le groupe" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* Client info */}
            <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
              borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:38}}>{modal.mood.e}</span>
              <div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F.title}}>{modal.name}</div>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
                  Groupe de {modal.size} · {modal.mood.l}
                </div>
                <div style={{fontSize:11,color:C.navy,fontWeight:600,marginTop:3,fontFamily:F.body}}>
                  Bonus XP ×{modal.mood.b}
                </div>
              </div>
            </div>

            {/* Table picker */}
            <div>
              <Lbl>Choisir une table</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {freeTbl(modal).map(t=>{

                  const sel=tgtT===String(t.id);
                  return(
                    <div key={t.id} onClick={()=>setTgtT(String(t.id))}
                      style={{background:sel?C.greenP:C.bg,
                        border:`2px solid ${sel?C.green:C.border}`,
                        borderRadius:10,padding:"11px 13px",cursor:"pointer"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{t.name}</span>
                        <span style={{fontSize:17}}>🪑</span>
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                        👥 {t.capacity} couverts
                      </div>
                      {t.freedAt&&(
                        <div style={{fontSize:9,color:C.green,fontWeight:600,marginTop:3,fontFamily:F.body}}>
                          ✓ Libre depuis {new Date(t.freedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      )}
                    </div>
                  );
                })}
                {freeTbl(modal).length===0&&(
                  <div style={{color:C.red,fontSize:13,gridColumn:"1/-1",fontFamily:F.body,padding:"8px 0"}}>
                    Aucune table disponible.
                  </div>
                )}
              </div>
            </div>

            {/* Server picker */}
            <div>
              <Lbl>Choisir un serveur</Lbl>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {activeSrv.map(sv=>{
                  const sl=srvLv(sv.totalXp);
                  const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
                  const sel=tgtS===sv.name;
                  return(
                    <div key={sv.id} onClick={()=>setTgtS(sv.name)}
                      style={{background:sel?C.greenP:C.bg,
                        border:`2px solid ${sel?C.green:C.border}`,
                        borderRadius:10,padding:"11px 13px",cursor:"pointer",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F.body}}>{sv.name}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <Badge color={slD.color} sm>{slD.icon} {slD.name}</Badge>
                          <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>⭐ {sv.rating}</span>
                        </div>
                      </div>
                      <div style={{width:72}}>
                        <div style={{fontSize:10,color:C.muted,textAlign:"right",marginBottom:3,fontFamily:F.body}}>
                          {sl.r}/{sl.n}
                        </div>
                        <XpBar xp={sl.r} needed={sl.n} color={slD.color} h={3}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order preview */}
            {preview.length>0&&(
              <div style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,borderRadius:12,padding:14}}>
                <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:10,fontFamily:F.body}}>
                  📋 Commande du serveur (aperçu)
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {preview.map((o,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,fontFamily:F.body}}>
                      <div style={{display:"flex",gap:7,alignItems:"center"}}>
                        <Badge color={catColors[o.cat]||C.navy} sm>{o.cat}</Badge>
                        <span style={{color:C.ink}}>{o.qty}× {o.item}</span>
                      </div>
                      <span style={{color:C.terra,fontWeight:600}}>{(o.price*o.qty).toFixed(2)}€</span>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${C.terra}33`,paddingTop:8,marginTop:2,
                    display:"flex",justifyContent:"space-between",fontWeight:700,fontFamily:F.title}}>
                    <span style={{fontSize:12,color:C.muted}}>Total estimé</span>
                    <span style={{color:C.terra,fontSize:16}}>
                      {preview.reduce((s,o)=>s+o.price*o.qty,0).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn>
              <Btn onClick={confirm} disabled={!tgtT||!tgtS||preview.length===0} v="terra" icon="🔥">
                Envoyer en cuisine
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   SERVERS VIEW
═══════════════════════════════════════════════════════ */
function ServersView({servers,setServers,tables,clockNow,restoLvN,cash,setCash,addTx,addToast}){
  const [modal,setModal]=useState(false);   // "add" | "edit" | "fire" | "train" | false
  const [form,setForm]=useState({name:"",status:"actif",salary:"12"});
  const [editId,setEditId]=useState(null);
  const [fireId,setFireId]=useState(null);
  const [trainId,setTrainId]=useState(null);

  const openTrain = (sv) => { setTrainId(sv.id); setModal("train"); };

  const doTrain = (sv, domain, level) => {
    const cost = level.cost;
    if(cash < cost){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Formation : ${cost}€ requis`,color:C.red,tab:"servers"});
      return;
    }
    const prevLevel = (sv.trainings||{})[domain.id] || 0;
    if(prevLevel >= domain.levels.length){
      addToast&&addToast({icon:"✅",title:"Formation maximale",msg:`${sv.name} a déjà atteint le niveau maximum.`,color:C.muted,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-cost).toFixed(2));
    addTx&&addTx("achat",`Formation ${domain.name} N${level.l} — ${sv.name}`,cost);

    setServers(p=>p.map(s=>{
      if(s.id!==sv.id) return s;
      const newTrainings = {...(s.trainings||{}), [domain.id]: level.l};
      const newXp = s.totalXp + level.xp;
      const newMoral = Math.min(getMaxMoral({...s,trainings:newTrainings}),(s.moral??100)+level.moralBonus);
      // Assign/upgrade specialty if domain has one
      let newSpecialty = s.specialty;
      let newSpecUpgraded = s.specialtyUpgraded;
      if(level.specialtyId){
        const sp = SRV_SPECIALTIES.find(x=>x.id===level.specialtyId);
        if(!s.specialty){
          newSpecialty = sp;
        } else if(s.specialty.id===level.specialtyId && level.l===3 && !s.specialtyUpgraded){
          newSpecUpgraded = true;
        } else if(!s.specialty){
          newSpecialty = sp;
        }
      }
      return {...s,
        trainings: newTrainings,
        totalXp: newXp,
        moral: newMoral,
        specialty: newSpecialty,
        specialtyUpgraded: newSpecUpgraded,
        lastTrainedAt: Date.now(),
      };
    }));

    addToast&&addToast({
      icon:domain.icon,
      title:`${sv.name} — ${domain.name} N${level.l} !`,
      msg:`${level.effect} · +${level.xp} XP · +${level.moralBonus} moral`,
      color:domain.color, tab:"servers"
    });
    setModal(false);
    setTrainId(null);
  };

  const maxSlots = SERVER_SLOTS_BY_LEVEL[Math.min(restoLvN||0,5)]||2;
  const canHire  = servers.length < maxSlots;
  // Coût de recrutement : 3× le salaire horaire
  const hireCost = Math.round(+(form.salary||12)*3);
  const canAfford = cash >= hireCost;

  const openAdd = () => {
    const salary = String(Math.floor(Math.random()*5+10));
    const name   = rName();
    const hireCost = Math.round(+(salary)*3);
    if(cash < hireCost){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Recrutement : ${hireCost}€ requis`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-hireCost).toFixed(2));
    addTx&&addTx("achat",`Recrutement — ${name}`,hireCost);
    setServers(p=>[...p,{id:Date.now(),name,status:"actif",totalXp:0,rating:4.0,salary:+salary,moral:100,specialty:null}]);
    addToast&&addToast({icon:"👔",title:`${name} embauché·e !`,msg:`−${hireCost}€ · Salaire ${salary}€/h`,color:C.green,tab:"servers"});
  };
  const openEdit = (sv) => {
    setEditId(sv.id);
    setForm({name:sv.name,status:sv.status,salary:String(sv.salary||12)});
    setModal("edit");
  };
  const openFire = (sv) => {
    setFireId(sv.id);
    setModal("fire");
  };

  const save = () => {
    if(!form.name.trim()) return;
    if(modal==="add"){
      if(!canAfford){ addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Recrutement : ${hireCost}€ requis`,color:C.red,tab:"servers"}); return; }
      setCash&&setCash(c=>+(c-hireCost).toFixed(2));
      addTx&&addTx("achat",`Recrutement — ${form.name}`,hireCost);
      setServers(p=>[...p,{id:Date.now(),name:form.name,status:form.status,totalXp:0,rating:4.0,salary:+(form.salary||12)}]);
      addToast&&addToast({icon:"👔",title:`${form.name} embauché·e !`,msg:`−${hireCost}€ · Salaire ${form.salary}€/h`,color:C.green,tab:"servers"});
    } else {
      setServers(p=>p.map(s=>s.id===editId?{...s,name:form.name,status:form.status,salary:+(form.salary||0)}:s));
    }
    setModal(false);
  };

  const doFire = () => {
    const sv = servers.find(s=>s.id===fireId);
    if(!sv) return;
    setServers(p=>p.filter(s=>s.id!==fireId));
    addToast&&addToast({icon:"👋",title:`${sv.name} licencié·e`,msg:"Le serveur a quitté l'équipe.",color:C.terra,tab:"servers"});
    setModal(false);
    setFireId(null);
  };

  const sColor={actif:C.green,pause:C.terra,repos:C.muted,service:C.amber};
  const sBg   ={actif:C.greenP,pause:C.terraP,repos:C.bg,service:C.amberP};

  return(
    <div>
      {/* ── Header barre ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>
            👤 Équipe — {servers.length}/{maxSlots} serveurs
          </span>
          <span style={{fontSize:11,background:canHire?C.greenP:C.redP,
            color:canHire?C.green:C.red,border:`1px solid ${canHire?C.green:C.red}33`,
            borderRadius:20,padding:"2px 10px",fontFamily:F.body,fontWeight:600}}>
            {canHire?`${maxSlots-servers.length} poste${maxSlots-servers.length>1?"s":""} disponible${maxSlots-servers.length>1?"s":""}`:"Équipe complète"}
          </span>
        </div>
        <Btn onClick={openAdd} disabled={!canHire} v={canHire?"primary":"disabled"} icon="➕">
          Embaucher un serveur
        </Btn>
      </div>

      {/* ── Grille des serveurs ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:13}}>
        {servers.map(sv=>{
          const sl=srvLv(sv.totalXp);
          const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
          const asgn=tables.filter(t=>t.server===sv.name);
          const isWorking=sv.status==="service";
          const moral=sv.moral??100;
          const mc=moralColor(moral);
          const mi=moralIcon(moral);
          const ml=moralLabel(moral);
          const isBurnout=moral<=10;
          const isExhausted=moral<=20;
          const sp=sv.specialty;
          const primeCost=50;
          const canAffordPrime=cash>=primeCost;

          return(
            <Card key={sv.id} accent={isBurnout?C.red+"66":slD.color+"44"}>
              {/* Ligne 1 : avatar + nom + note */}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:44,height:44,background:slD.color+"1a",
                    border:`2px solid ${isBurnout?C.red:slD.color}33`,borderRadius:12,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
                    position:"relative"}}>
                    {slD.icon}
                    {/* Moral badge */}
                    <div style={{position:"absolute",bottom:-5,right:-5,
                      width:18,height:18,borderRadius:"50%",fontSize:10,
                      background:C.surface,border:`1.5px solid ${mc}`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {mi}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{sv.name}</div>
                    <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
                      <Badge color={slD.color} sm>{slD.name}</Badge>
                      <Badge color={sColor[sv.status]||C.muted} bg={sBg[sv.status]||C.bg} sm>
                        {isWorking
                          ?`🛎 (${Math.max(0,Math.ceil((sv.serviceUntil-clockNow)/1000))}s)`
                          :sv.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:700,color:C.amber,fontFamily:F.title}}>
                    {sv.rating}<span style={{fontSize:10,color:C.muted}}>/5</span>
                  </div>
                </div>
              </div>

              {/* Spécialité */}
              {sp?(
                <div style={{background:sp.color+"12",border:`1px solid ${sp.color}33`,
                  borderRadius:8,padding:"6px 10px",marginBottom:10,
                  display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{sp.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:sp.color,fontFamily:F.body}}>
                      {sp.name}{sv.specialtyUpgraded?" ✦":""}
                    </div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{sp.desc}</div>
                  </div>
                </div>
              ):sl.l>=1?(
                <div style={{background:C.bg,border:`1px dashed ${C.border}`,
                  borderRadius:8,padding:"6px 10px",marginBottom:10,
                  fontSize:10,color:C.muted,fontFamily:F.body}}>
                  🔒 Spécialité débloquée au niveau 2
                </div>
              ):null}

              {/* Barre XP */}
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
                  <span>XP · Niv.{sl.l}</span>
                  <span style={{color:slD.color,fontWeight:600}}>{sl.r}/{sl.n}</span>
                </div>
                <XpBar xp={sl.r} needed={sl.n} color={slD.color}/>
              </div>

              {/* Jauge Moral */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:10,marginBottom:4,fontFamily:F.body}}>
                  <span style={{color:C.muted}}>Moral {mi} {ml}</span>
                  <span style={{fontWeight:700,color:mc}}>{moral}/100</span>
                </div>
                <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${moral}%`,background:mc,
                    borderRadius:99,transition:"width 0.5s ease"}}/>
                </div>
                {isBurnout&&(
                  <div style={{fontSize:9,color:C.red,fontWeight:700,fontFamily:F.body,marginTop:3,
                    animation:"pulse 1s infinite"}}>
                    ⚠ Burnout — refuse les nouvelles tables !
                  </div>
                )}
                {!isBurnout&&isExhausted&&(
                  <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3}}>
                    😓 Épuisé — service ralenti +20%
                  </div>
                )}
              </div>

              {/* Infos */}
              <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>
                <div>📍 {asgn.length>0?asgn.map(t=>t.name).join(", "):"Aucune table"}</div>
                <div style={{marginTop:2}}>🏆 {sv.totalXp} XP · 💸 {(sv.salary||0).toFixed(0)} €/h</div>
                {Object.keys(sv.trainings||{}).length>0&&(
                  <div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap"}}>
                    {TRAINING_CATALOG.filter(d=>(sv.trainings||{})[d.id]>0).map(d=>(
                      <span key={d.id} style={{fontSize:9,background:d.color+"14",color:d.color,
                        border:`1px solid ${d.color}22`,borderRadius:5,padding:"1px 6px",
                        fontFamily:F.body,fontWeight:600}}>
                        {d.icon} N{(sv.trainings||{})[d.id]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {sv.status==="actif"&&!isWorking&&(
                  <Btn sm v="terra" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"pause"}:x))}>
                    ⏸ Pause
                  </Btn>
                )}
                {sv.status==="pause"&&(
                  <Btn sm v="primary" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"actif"}:x))}>
                    ▶ Activer
                  </Btn>
                )}
                {isWorking&&(
                  <span style={{fontSize:11,color:C.amber,fontFamily:F.body,alignSelf:"center"}}>
                    🛎 En service…
                  </span>
                )}
                {/* Prime de motivation */}
                {moral<60&&!isWorking&&(
                  <Btn sm v={canAffordPrime?"navy":"disabled"}
                    disabled={!canAffordPrime}
                    onClick={()=>{
                      if(!canAffordPrime)return;
                      setCash&&setCash(c=>+(c-primeCost).toFixed(2));
                      addTx&&addTx("achat",`Prime motivation — ${sv.name}`,primeCost);
                      setServers(p=>p.map(x=>x.id!==sv.id?x:{...x,moral:Math.min(100,x.moral+50)}));
                      addToast&&addToast({icon:"🎁",title:`Prime versée à ${sv.name}`,
                        msg:`+50 moral · −${primeCost}€`,color:C.navy,tab:"servers"});
                    }}>
                    🎁 Prime {primeCost}€
                  </Btn>
                )}
                {!isWorking&&(
                  <Btn sm v="danger" onClick={()=>openFire(sv)}>Licencier</Btn>
                )}
                <Btn sm v="secondary" onClick={()=>openTrain(sv)} icon="🎓">
                  Former
                </Btn>
              </div>
            </Card>
          );
        })}

        {/* ── Slots libres cliquables ── */}
        {canHire&&Array.from({length:maxSlots-servers.length},(_,i)=>(
          <div key={`free-${i}`} onClick={openAdd}
            className="hovcard"
            style={{background:C.bg,border:`1.5px dashed ${C.green}55`,
              borderRadius:14,padding:"18px 16px",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",minHeight:160,gap:10,cursor:"pointer",
              transition:"all 0.2s"}}>
            <div style={{width:44,height:44,background:C.greenP,border:`2px dashed ${C.green}66`,
              borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              ➕
            </div>
            <div style={{fontSize:12,color:C.green,fontWeight:600,fontFamily:F.body}}>
              Poste vacant
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>
              Cliquez pour embaucher
            </div>
          </div>
        ))}

        {/* ── Slots verrouillés ── */}
        {(()=>{
          const nextLevelSlots=Object.entries(SERVER_SLOTS_BY_LEVEL)
            .filter(([lv,sl])=>parseInt(lv)>restoLvN&&sl>maxSlots)
            .slice(0,2);
          if(!nextLevelSlots.length)return null;
          return nextLevelSlots.map(([lv])=>{
            const r=RESTO_LVL.find(x=>x.l===parseInt(lv));
            return(
              <div key={`lock-${lv}`} style={{background:C.bg,border:`1.5px dashed ${C.border}`,
                borderRadius:14,padding:"18px 16px",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",minHeight:160,gap:8,opacity:0.6}}>
                <span style={{fontSize:32}}>🔒</span>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,textAlign:"center"}}>
                  Poste verrouillé
                </div>
                {r&&<span style={{fontSize:11,background:r.color+"18",color:r.color,
                  border:`1px solid ${r.color}33`,borderRadius:6,padding:"2px 8px",
                  fontFamily:F.body,fontWeight:600}}>
                  {r.icon} Niveau {r.l} — {r.name}
                </span>}
              </div>
            );
          });
        })()}
      </div>

      {/* ── Modale Formation ── */}
      {modal==="train"&&(()=>{
        const sv=servers.find(s=>s.id===trainId);
        if(!sv)return null;
        const sl=srvLv(sv.totalXp);
        const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
        return(
          <div onClick={()=>{setModal(false);setTrainId(null);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
              zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div onClick={e=>e.stopPropagation()}
              style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
                width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",
                boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

              {/* Header */}
              <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
                display:"flex",justifyContent:"space-between",alignItems:"center",
                position:"sticky",top:0,background:C.surface,zIndex:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,background:slD.color+"1a",
                    border:`2px solid ${slD.color}33`,borderRadius:10,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                    {slD.icon}
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                      🎓 Former {sv.name}
                    </div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      Niv.{sl.l} · {sv.totalXp} XP · Moral {sv.moral??100}/100
                      {sv.specialty&&` · ${sv.specialty.icon} ${sv.specialty.name}`}
                    </div>
                  </div>
                </div>
                <button onClick={()=>{setModal(false);setTrainId(null);}}
                  style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                    width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              {/* Solde */}
              <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Solde disponible :</span>
                <span style={{fontSize:14,fontWeight:700,color:cash<100?C.red:C.green,fontFamily:F.title}}>
                  {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </span>
              </div>

              {/* Domaines */}
              <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:20}}>
                {TRAINING_CATALOG.map(domain=>{
                  const currentLevel=(sv.trainings||{})[domain.id]||0;
                  const isMaxed=currentLevel>=domain.levels.length;
                  const nextLevel=domain.levels[currentLevel]||null;
                  return(
                    <div key={domain.id} style={{
                      border:`1.5px solid ${domain.color}33`,borderRadius:14,overflow:"hidden"}}>

                      {/* Domain header */}
                      <div style={{background:domain.color+"12",padding:"12px 16px",
                        display:"flex",alignItems:"center",gap:12,
                        borderBottom:`1px solid ${domain.color}22`}}>
                        <span style={{fontSize:22}}>{domain.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:domain.color,fontFamily:F.title}}>
                            {domain.name}
                          </div>
                          <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>
                            {domain.desc}
                          </div>
                        </div>
                        {/* Niveau actuel */}
                        <div style={{display:"flex",gap:4,flexShrink:0}}>
                          {domain.levels.map((_,i)=>(
                            <div key={i} style={{
                              width:10,height:10,borderRadius:"50%",
                              background:i<currentLevel?domain.color:C.border,
                              border:`1.5px solid ${domain.color}`,
                              transition:"background 0.3s"}}/>
                          ))}
                        </div>
                        {isMaxed&&(
                          <span style={{fontSize:11,background:domain.color,color:"#fff",
                            borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:700}}>
                            ✓ Max
                          </span>
                        )}
                      </div>

                      {/* Niveaux */}
                      <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:8}}>
                        {domain.levels.map((level,i)=>{
                          const isDone=i<currentLevel;
                          const isNext=i===currentLevel;
                          const isLocked=i>currentLevel;
                          const canAffordThis=cash>=level.cost;
                          return(
                            <div key={i} style={{
                              display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                              borderRadius:10,
                              background:isDone?C.greenP:isNext?domain.color+"0a":C.bg,
                              border:`1px solid ${isDone?C.green+"33":isNext?domain.color+"33":C.border}`,
                              opacity:isLocked?0.45:1}}>

                              {/* Indicateur niveau */}
                              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                                background:isDone?C.green:isNext?domain.color:C.border,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:12,fontWeight:800,color:"#fff"}}>
                                {isDone?"✓":level.l}
                              </div>

                              {/* Infos */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,
                                    color:isDone?C.green:isNext?domain.color:C.muted,
                                    fontFamily:F.body}}>
                                    Niveau {level.l} — {level.name}
                                  </span>
                                  {isDone&&<span style={{fontSize:9,background:C.green,color:"#fff",
                                    borderRadius:99,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>
                                    Acquis
                                  </span>}
                                </div>
                                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:4}}>
                                  {level.desc}
                                </div>
                                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                  <span style={{fontSize:10,background:domain.color+"14",
                                    color:domain.color,border:`1px solid ${domain.color}22`,
                                    borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                    ✦ {level.effect}
                                  </span>
                                  <span style={{fontSize:10,background:C.greenP,color:C.green,
                                    border:`1px solid ${C.green}22`,
                                    borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                    +{level.xp} XP
                                  </span>
                                  {level.moralBonus>0&&(
                                    <span style={{fontSize:10,background:C.amberP,color:C.amber,
                                      border:`1px solid ${C.amber}22`,
                                      borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>
                                      +{level.moralBonus} moral
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Prix + bouton */}
                              {isNext&&(
                                <div style={{flexShrink:0,textAlign:"right"}}>
                                  <div style={{fontSize:14,fontWeight:800,
                                    color:canAffordThis?domain.color:C.red,
                                    fontFamily:F.title,marginBottom:6}}>
                                    {level.cost} €
                                  </div>
                                  <Btn sm
                                    v={canAffordThis?"primary":"disabled"}
                                    disabled={!canAffordThis}
                                    onClick={()=>doTrain(sv,domain,level)}>
                                    {canAffordThis?"Financer":"Fonds insuffisants"}
                                  </Btn>
                                </div>
                              )}
                              {isDone&&(
                                <div style={{fontSize:11,color:C.green,fontFamily:F.body,flexShrink:0}}>
                                  ✅
                                </div>
                              )}
                              {isLocked&&(
                                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,flexShrink:0}}>
                                  🔒
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modale Licenciement ── */}
      {modal==="fire"&&(()=>{
        const sv=servers.find(s=>s.id===fireId);
        if(!sv)return null;
        return(
          <Modal title="👋 Licencier un serveur" onClose={()=>{setModal(false);setFireId(null);}}>
            <div style={{display:"flex",flexDirection:"column",gap:18,textAlign:"center"}}>
              <div style={{fontSize:42}}>{SRV_LVL[Math.min(srvLv(sv.totalXp).l,SRV_LVL.length-1)].icon}</div>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:6}}>
                  {sv.name}
                </div>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body,lineHeight:1.6}}>
                  Niv.{srvLv(sv.totalXp).l} · {sv.totalXp} XP · {sv.rating}/5 ⭐<br/>
                  Cette action est <strong>irréversible</strong>. Tout son XP sera perdu.
                </div>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                <Btn v="ghost" onClick={()=>{setModal(false);setFireId(null);}}>Annuler</Btn>
                <Btn v="danger" onClick={doFire} icon="👋">Licencier</Btn>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   KITCHEN VIEW
═══════════════════════════════════════════════════════ */
function KitchenView({kitchen,setKitchen,stock,setStock,tables,setTables,addToast,cash,setCash,addTx}){
  const chf=kitchen.chef;
  const cl=chefLv(chf.totalXp);
  const clD=CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
  const unlockedCommis=clD.commis;

  // Compute upgrade bonuses
  const upg=kitchen.upgrades||{fourneau:0,four:0,stockage:0,plonge:0};
  const extraSlots=KITCHEN_UPGRADES.find(u=>u.id==="fourneau").levels.slice(0,upg.fourneau).reduce((s,l)=>s+l.bonus.slots,0);
  const speedBonus=KITCHEN_UPGRADES.find(u=>u.id==="four").levels.slice(0,upg.four).reduce((s,l)=>s+l.bonus.speed,0);
  const maxConcurrent=4+unlockedCommis+extraSlots;

  const upgDishCookTime=(prepTime,chefSpeed,commisCount)=>
    Math.max(5,Math.round(prepTime/((chefSpeed+speedBonus)*(1+commisCount*0.15))));

  const catColors={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

  // Live clock for rendering (independent of logic intervals)
  const [now,setNow]=useState(Date.now());
  const [chefSalaryEdit,setChefSalaryEdit]=useState(false);
  const [chefSalaryVal,setChefSalaryVal]=useState(String(kitchen.chef.salary||28));
  useEffect(()=>{
    const iv=setInterval(()=>setNow(Date.now()),250);
    return()=>clearInterval(iv);
  },[]);

  // Consume ingredients from stock + return total cost deducted + missing list
  const consumeStock=(dishes,prevStock)=>{
    let s=[...prevStock];
    let cost=0;
    const missing=[];
    dishes.forEach(d=>(d.ingredients||[]).forEach(ing=>{
      const item=s.find(x=>x.id===ing.stockId);
      if(item){
        if(item.qty<ing.qty) missing.push({dish:d.name,ing:item.name,need:ing.qty,have:item.qty});
        cost+=+(ing.qty*(item.price||0)).toFixed(4);
        s=s.map(x=>x.id===ing.stockId?{...x,qty:Math.max(0,+(x.qty-ing.qty).toFixed(3))}:x);
      }
    }));
    return{newStock:s,cost:+cost.toFixed(2),missing};
  };

  // Completion check — runs every 500ms, compares timestamps only
  useEffect(()=>{
    const iv=setInterval(()=>{
      const t=Date.now();
      setKitchen(k=>{
        const justDone=k.cooking.filter(d=>t>=d.startedAt+d.timerMax*1000);
        if(justDone.length===0)return k;
        const stillCooking=k.cooking.filter(d=>t<d.startedAt+d.timerMax*1000);
        const xpPerDish=12;
        const activeCommis=k.commis.filter(c=>c.status==="actif").slice(0,unlockedCommis);
        return {
          ...k,
          chef:{...k.chef,totalXp:k.chef.totalXp+justDone.length*xpPerDish},
          commis:k.commis.map(c=>
            activeCommis.find(a=>a.id===c.id)
              ?{...c,totalXp:c.totalXp+Math.round(xpPerDish*0.4)}
              :c
          ),
          cooking:stillCooking,
          done:[...k.done,...justDone.map(d=>({...d,completedAt:t}))],
          totalDishes:k.totalDishes+justDone.length,
        };
      });
    },500);
    return()=>clearInterval(iv);
  },[unlockedCommis]);

  // Chef level-up toast
  useEffect(()=>{
    const cl2=chefLv(kitchen.chef.totalXp);
    if(cl2.l>0&&cl2.r<12){
      const d=CHEF_LVL[Math.min(cl2.l,CHEF_LVL.length-1)];
      addToast({icon:"👨‍🍳",title:`Chef niveau ${cl2.l} !`,
        msg:`${kitchen.chef.name} → ${d.name}`,color:C.purple,tab:"cuisine"});
    }
  },[chefLv(kitchen.chef.totalXp).l]);

  // Start one dish
  const startDish=(dish)=>{
    if(kitchen.cooking.length>=maxConcurrent)return;
    const ct=upgDishCookTime(dish.prepTime||60,clD.speed,unlockedCommis);
    let blocked=false;
    setStock(s=>{
      const{newStock,missing}=consumeStock([dish],s);
      if(missing.length>0){
        blocked=true;
        missing.forEach(m=>addToast({icon:"⚠️",title:"Stock insuffisant !",
          msg:`${m.dish} : manque ${m.ing} (${m.have.toFixed(2)}/${m.need.toFixed(2)})`,
          color:C.red,tab:"stock"}));
        return s;
      }
      return newStock;
    });
    if(blocked)return;
    setKitchen(k=>({
      ...k,
      queue:k.queue.filter(d=>d.id!==dish.id),
      cooking:[...k.cooking,{...dish,startedAt:Date.now(),timerMax:ct}],
    }));
    addToast({icon:"🔥",title:"Cuisson démarrée",
      msg:`${dish.name}${dish.tableName?" · "+dish.tableName:""}`,color:C.terra,tab:"cuisine"});
  };

  // Start all dishes filling free slots
  const startAll=()=>{
    const slots=maxConcurrent-kitchen.cooking.length;
    if(slots<=0)return;
    const toStart=kitchen.queue.slice(0,slots);
    if(toStart.length===0)return;
    const ts=Date.now();
    setStock(s=>{
      const{newStock}=consumeStock(toStart,s);
      return newStock;
    });
    setKitchen(k=>({
      ...k,
      queue:k.queue.filter(d=>!toStart.find(x=>x.id===d.id)),
      cooking:[...k.cooking,...toStart.map(d=>({
        ...d,
        startedAt:ts,
        timerMax:upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis),
      }))],
    }));
  };

  // Serve all done dishes for a table → table becomes "mange" with eating timer
  const serveTable=(tableId,tableName)=>{
    setKitchen(k=>{
      const dishes=k.done.filter(d=>d.tableId===tableId);
      const maxPrep=Math.max(...dishes.map(d=>d.prepTime||60),60);
      const eatSec=Math.round(maxPrep*(2/3));
      setTables(p=>p.map(t=>t.id!==tableId?t:{...t,status:"mange",eatUntil:Date.now()+eatSec*1000,eatDur:eatSec}));
      return {...k,done:k.done.filter(d=>d.tableId!==tableId)};
    });
    addToast({icon:"🍽",title:"Plats servis !",
      msg:`${tableName} · bon appétit !`,color:C.green,tab:"tables"});
  };

  // Group done dishes by table
  const doneByTable={};
  kitchen.done.forEach(d=>{
    const key=d.tableId||"sans-table";
    if(!doneByTable[key])doneByTable[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
    doneByTable[key].dishes.push(d);
  });
  // Group queue by table
  const queueByTable={};
  kitchen.queue.forEach(d=>{
    const key=d.tableId||"sans-table";
    if(!queueByTable[key])queueByTable[key]={tableId:d.tableId,tableName:d.tableName||"Sans table",dishes:[]};
    queueByTable[key].dishes.push(d);
  });
  // A table can be served only if no dishes still queued or cooking for it
  const canServeTable=(tableId)=>{
    const inQ=kitchen.queue.filter(d=>d.tableId===tableId).length;
    const inC=kitchen.cooking.filter(d=>d.tableId===tableId).length;
    return inQ===0&&inC===0;
  };

  const slotsLeft=maxConcurrent-kitchen.cooking.length;

  const IngBadges=({ingredients})=>{
    if(!ingredients||ingredients.length===0)return null;
    return(
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
        {ingredients.map(ing=>{
          const s=stock.find(x=>x.id===ing.stockId);
          return(
            <span key={ing.stockId} style={{fontSize:9,background:C.amberP,color:C.amber,
              border:`1px solid ${C.amber}22`,borderRadius:4,padding:"1px 6px",fontFamily:F.body}}>
              🧂{s?.name||"?"} −{ing.qty}{s?.unit||""}
            </span>
          );
        })}
      </div>
    );
  };

  return(
    <div>
      {/* Chef hero */}
      <div style={{background:`linear-gradient(135deg,${clD.bg},${C.surface})`,
        border:`2px solid ${clD.color}44`,borderRadius:18,padding:20,marginBottom:18,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{width:68,height:68,background:clD.color+"22",border:`3px solid ${clD.color}55`,
            borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>
            {clD.icon}
          </div>
          <div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
              <Badge color={clD.color} bg={clD.bg}>{clD.name}</Badge>
              <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Niveau {cl.l}</span>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:C.ink,fontFamily:F.title}}>{chf.name}</div>
            <div style={{fontSize:11,color:clD.color,fontWeight:600,marginTop:3,fontFamily:F.body}}>
              ⚡×{clD.speed} · 🧑‍🍳{clD.commis} commis · 🍽{kitchen.totalDishes} plats · {slotsLeft}/{maxConcurrent} feux libres
            </div>
            <div style={{marginTop:5,display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:12}}>💸</span>
              <span style={{fontSize:12,color:C.navy,fontWeight:700,fontFamily:F.body}}>{(chf.salary||0).toFixed(0)} €/h</span>
            </div>
          </div>
        </div>
        <div style={{minWidth:175}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:5,fontFamily:F.body}}>
            <span style={{color:clD.color,fontWeight:600}}>XP Chef</span>
            <span>{cl.r}/{cl.n}</span>
          </div>
          <XpBar xp={cl.r} needed={cl.n} color={clD.color} h={8}/>
        </div>
      </div>

      {/* Commis row */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {kitchen.commis.map((cm,idx)=>{
          const locked=idx>=unlockedCommis;
          const cml=commisLv(cm.totalXp);
          const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
          return(
            <div key={cm.id} style={{background:locked?C.bg:C.card,
              border:`1.5px solid ${locked?C.border:cmlD.color+"44"}`,
              borderRadius:11,padding:"10px 13px",opacity:locked?0.4:1,
              display:"flex",gap:9,alignItems:"center",minWidth:160,flex:"0 0 auto"}}>
              <div style={{width:32,height:32,background:cmlD.color+"1a",
                border:`2px solid ${cmlD.color}33`,borderRadius:9,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>
                {locked?"🔒":cmlD.icon}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body}}>{cm.name}</div>
                {locked
                  ?<div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>Débloqué Niv.{idx===1?2:4}</div>
                  :<><Badge color={cmlD.color} sm>{cmlD.name}</Badge>
                    <div style={{fontSize:10,color:C.muted,marginTop:3,fontFamily:F.body}}>{cml.r}/{cml.n} XP</div>
                    <div style={{fontSize:10,color:C.navy,fontWeight:600,marginTop:2,fontFamily:F.body}}>💸 {(cm.salary||0).toFixed(0)} €/h</div>
                  </>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>

        {/* Queue */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:600,color:C.amber,fontFamily:F.title}}>
              ⏳ En attente ({kitchen.queue.length})
            </span>
            {kitchen.queue.length>0&&slotsLeft>0&&(
              <Btn sm v="terra" onClick={startAll} icon="▶">Tout démarrer</Btn>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {kitchen.queue.length===0&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
                padding:16,textAlign:"center",color:C.muted,fontSize:12,fontStyle:"italic",fontFamily:F.body}}>
                Les commandes des tables arriveront ici
              </div>
            )}
            {Object.values(queueByTable).map(tblQ=>{
              const canStart=kitchen.cooking.length<maxConcurrent;
              return(
                <div key={tblQ.tableId||"nt"} style={{background:C.amberP,
                  border:`1.5px solid ${C.amber}33`,borderRadius:11,overflow:"hidden"}}>
                  {/* Table sub-header */}
                  <div style={{background:C.amber+"18",padding:"6px 12px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    borderBottom:`1px solid ${C.amber}22`}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.amber,fontFamily:F.title}}>
                      📍 {tblQ.tableName}
                    </span>
                    <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>
                      {tblQ.dishes.length} plat{tblQ.dishes.length>1?"s":""}
                    </span>
                  </div>
                  {/* Dish rows */}
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {tblQ.dishes.map((d,i)=>{
                      const estSec=upgDishCookTime(d.prepTime||60,clD.speed,unlockedCommis);
                      const estMin=estSec>=60?`${Math.floor(estSec/60)}m${String(estSec%60).padStart(2,"0")}s`:estSec+"s";
                      return(
                        <div key={d.id} style={{padding:"9px 12px",
                          borderTop:i>0?`1px solid ${C.amber}22`:undefined,
                          display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body}}>{d.name}</div>
                            <div style={{display:"flex",gap:5,marginTop:3}}>
                              <Badge color={catColors[d.cat]||C.navy} sm>{d.cat}</Badge>
                              <span style={{fontSize:10,color:C.amber,fontWeight:600,fontFamily:F.body}}>⏱ {estMin}</span>
                            </div>
                          </div>
                          <Btn sm v={canStart?"terra":"ghost"} disabled={!canStart} onClick={()=>startDish(d)}>
                            {canStart?"▶":"⛔"}
                          </Btn>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cooking */}
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.terra,fontFamily:F.title,marginBottom:10}}>
            🔥 En cuisson ({kitchen.cooking.length}/{maxConcurrent})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {kitchen.cooking.length===0&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
                padding:16,textAlign:"center",color:C.muted,fontSize:12,fontStyle:"italic",fontFamily:F.body}}>
                Démarrez une cuisson depuis la file
              </div>
            )}
            {kitchen.cooking.map(d=>{
              const remaining=Math.max(0,Math.ceil((d.startedAt+d.timerMax*1000-now)/1000));
              const elapsed=d.timerMax-remaining;
              const pct=d.timerMax>0?Math.min(100,(elapsed/d.timerMax)*100):0;
              const pc=pct<40?C.amber:pct<80?C.terra:C.green;
              const fmt=s=>s>=60?`${Math.floor(s/60)}m${String(s%60).padStart(2,"0")}s`:`${s}s`;
              return(
                <div key={d.id} style={{background:C.terraP,border:`1.5px solid ${C.terra}33`,borderRadius:10,padding:"11px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:F.body}}>{d.name}</div>
                      {d.tableName&&<div style={{fontSize:10,color:C.navy,fontFamily:F.body,marginTop:2}}>📍 {d.tableName}</div>}
                    </div>
                    <span style={{fontSize:13,color:pc,fontWeight:700,fontFamily:F.body}}>{fmt(remaining)}</span>
                  </div>
                  <XpBar xp={elapsed} needed={d.timerMax} color={pc} h={6}/>
                  <IngBadges ingredients={d.ingredients}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done — grouped by table */}
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.green,fontFamily:F.title,marginBottom:10}}>
            ✅ Prêts à servir ({kitchen.done.length})
          </div>
          {Object.keys(doneByTable).length===0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
              padding:16,textAlign:"center",color:C.muted,fontSize:12,fontStyle:"italic",fontFamily:F.body}}>
              Les plats terminés apparaîtront ici
            </div>
          )}
          {Object.values(doneByTable).map(tbl=>{
            const ready=canServeTable(tbl.tableId);
            return(
              <div key={tbl.tableId} style={{marginBottom:10,background:C.greenP,
                border:`1.5px solid ${ready?C.green:C.amber}44`,borderRadius:12,padding:13}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{tbl.tableName}</div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                      {tbl.dishes.length} plat{tbl.dishes.length>1?"s":""} prêt{tbl.dishes.length>1?"s":""}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    {ready&&(
                      <div style={{fontSize:10,fontWeight:800,color:C.green,fontFamily:F.body,
                        background:C.green+"18",borderRadius:6,padding:"2px 8px",
                        animation:"popIn 0.4s ease, pulse 2s ease-in-out 0.4s infinite"}}>
                        ✦ PRÊT !
                      </div>
                    )}
                    {ready
                      ?<Btn v="primary" sm onClick={()=>serveTable(tbl.tableId,tbl.tableName)} icon="🍽">
                        Servir
                      </Btn>
                      :<span style={{fontSize:11,color:C.amber,fontFamily:F.body}}>⏳ En attente…</span>
                    }
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {tbl.dishes.map((d,i)=>(
                    <span key={i} style={{fontSize:10,background:C.surface,border:`1px solid ${C.green}33`,
                      borderRadius:5,padding:"2px 8px",fontFamily:F.body,color:C.ink}}>
                      ✓ {d.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ── Améliorations cuisine ────────────────────── */}
      <div style={{marginTop:28}}>
        <div style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title,
          marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          🔧 Améliorations de la cuisine
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {KITCHEN_UPGRADES.map(upItem=>{
            const curLv=upg[upItem.id]||0;
            const maxLv=upItem.levels.length;
            const nextLv=upItem.levels[curLv]||null;
            const isMax=curLv>=maxLv;
            const canAfford=nextLv&&cash>=nextLv.cost;

            // Summary of active bonuses
            const activeBonuses=upItem.levels.slice(0,curLv).map(l=>{
              if(l.bonus.slots) return `+${l.bonus.slots} feu`;
              if(l.bonus.speed) return `−${Math.round(l.bonus.speed*100)}% cuisson`;
              if(l.bonus.storage) return `Stockage ×${1+upItem.levels.slice(0,curLv).reduce((s,x)=>s+(x.bonus.storage||0),0)}`;
              if(l.bonus.clean) return `Nettoyage −${l.bonus.clean}s`;
              return "";
            }).filter(Boolean);

            return(
              <div key={upItem.id} style={{
                background:isMax?C.greenP:C.card,
                border:`1.5px solid ${isMax?C.green:C.border}`,
                borderRadius:14,padding:16,
                boxShadow:isMax?`0 0 12px ${C.green}22`:`0 1px 5px rgba(0,0,0,0.06)`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{fontSize:28}}>{upItem.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body}}>{upItem.name}</div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>{upItem.desc}</div>
                  </div>
                </div>

                {/* Level pip bar */}
                <div style={{display:"flex",gap:4,marginBottom:10}}>
                  {upItem.levels.map((_,i)=>(
                    <div key={i} style={{
                      flex:1,height:5,borderRadius:3,
                      background:i<curLv?C.green:C.border,
                      transition:"background 0.3s",
                    }}/>
                  ))}
                </div>

                {/* Active bonuses */}
                {activeBonuses.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                    {activeBonuses.map((b,i)=>(
                      <span key={i} style={{fontSize:10,background:C.greenP,color:C.green,
                        border:`1px solid ${C.green}33`,borderRadius:5,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                )}

                {isMax?(
                  <div style={{textAlign:"center",fontSize:12,color:C.green,
                    fontWeight:700,fontFamily:F.body,padding:"8px 0"}}>
                    ✅ Niveau maximum atteint
                  </div>
                ):(
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:8}}>
                      Niveau {curLv+1} — {nextLv.label}
                    </div>
                    <Btn v={canAfford?"amber":"disabled"} sm
                      onClick={()=>{
                        if(!canAfford)return;
                        const newUpg={...upg,[upItem.id]:curLv+1};
                        setKitchen(k=>({...k,upgrades:newUpg}));
                        setCash(p=>+(p-nextLv.cost).toFixed(2));
                        addTx("dépense",`Amélioration cuisine : ${upItem.name} N${curLv+1}`,nextLv.cost);
                        addToast({icon:upItem.icon,title:`${upItem.name} N${curLv+1}`,
                          msg:nextLv.label,color:C.amber,tab:"cuisine"});
                      }}>
                      💰 {nextLv.cost} € — Améliorer
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MENU VIEW — Rentabilité, activation, prix dynamique
═══════════════════════════════════════════════════════ */

/* ── Thèmes de menu ── */
const MENU_THEMES=[
  {
    id:"bistrot",  icon:"🍺", name:"Bistrot",      color:C.green,
    desc:"Cuisine généreuse et abordable.",
    priceMult:0.90, repBonus:0,  xpMult:1.0,
    accent:"#eaf3ed",
  },
  {
    id:"gastro",   icon:"⭐", name:"Gastronomique", color:C.purple,
    desc:"Plats élaborés, prix premium +15%.",
    priceMult:1.15, repBonus:5,  xpMult:1.2,
    accent:"#f0eaf8",
  },
  {
    id:"saison",   icon:"🌿", name:"Saisonnier",    color:C.terra,
    desc:"Produits frais du marché, réputation +8.",
    priceMult:1.00, repBonus:8,  xpMult:1.1,
    accent:"#fdf0e8",
  },
  {
    id:"none",     icon:"📋", name:"Standard",      color:C.muted,
    desc:"Menu habituel sans modificateur.",
    priceMult:1.00, repBonus:0,  xpMult:1.0,
    accent:C.bg,
  },
];

/* ── Formules ── */
const FORMULA_PRESETS=[
  { id:"decouverte", icon:"🍽",  name:"Menu Découverte",  discount:0.12,
    cats:["Entrées","Plats","Desserts"], desc:"1 entrée + 1 plat + 1 dessert" },
  { id:"express",    icon:"⚡",  name:"Menu Express",     discount:0.08,
    cats:["Plats","Boissons"],          desc:"1 plat + 1 boisson" },
  { id:"prestige",   icon:"👑",  name:"Menu Prestige",    discount:0.15,
    cats:["Entrées","Plats","Desserts","Boissons"], desc:"Formule complète 4 services" },
];

function MenuView({menu,setMenu,stock,formulas,setFormulas,activeTheme,setActiveTheme,dailyStats}){
  const [mainTab,setMainTab]=useState("carte");
  const [catFilter,setCatFilter]=useState("Tout");
  const [sortBy,setSortBy]=useState("cat");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({name:"",cat:"Plats",price:"",prepTime:""});
  const [ingLines,setIngLines]=useState([]);
  const [newIngS,setNewIngS]=useState("");
  const [newIngQ,setNewIngQ]=useState("");
  const [formulaModal,setFormulaModal]=useState(null);
  const [fSelections,setFSelections]=useState({});

  const cats=["Tout","Entrées","Plats","Desserts","Boissons"];
  const catC={Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};
  const theme=(MENU_THEMES||[]).find(t=>t.id===(activeTheme||"none"))||{id:"none",icon:"📋",name:"Standard",color:C.muted,desc:"",priceMult:1,repBonus:0,xpMult:1,accent:C.bg};

  /* ── Calculs par plat ── */
  const dishCost=(m)=>
    (m.ingredients||[]).reduce((sum,ing)=>{
      const s=stock.find(x=>x.id===ing.stockId);
      return sum+(s?.price||0)*ing.qty;
    },0);
  const dishMargin=(m)=>{
    const cost=dishCost(m);
    if(!m.price||m.price===0)return null;
    return Math.round(((m.price-cost)/m.price)*100);
  };
  const portionsLeft=(m)=>{
    if(!(m.ingredients||[]).length)return 99;
    return Math.floor(Math.min(...m.ingredients.map(ing=>{
      const s=stock.find(x=>x.id===ing.stockId);
      if(!s||ing.qty===0)return 0;
      return s.qty/ing.qty;
    })));
  };

  /* ── Score de performance 0–100 ── */
  const perfScore=(m)=>{
    const mg=dishMargin(m)||0;
    const maxOrd=Math.max(...menu.map(x=>x.orderCount||0),1);
    const pop=Math.min(100,((m.orderCount||0)/maxOrd)*100);
    const avail=portionsLeft(m)>=5?100:portionsLeft(m)*20;
    return Math.round(mg*0.4+pop*0.4+avail*0.2);
  };

  /* ── Tri ── */
  const base=catFilter==="Tout"?menu:menu.filter(m=>m.cat===catFilter);
  const sorted=[...base].sort((a,b)=>{
    if(sortBy==="margin")  return (dishMargin(b)||0)-(dishMargin(a)||0);
    if(sortBy==="popular") return (b.orderCount||0)-(a.orderCount||0);
    if(sortBy==="stock")   return portionsLeft(a)-portionsLeft(b);
    if(sortBy==="score")   return perfScore(b)-perfScore(a);
    return 0;
  });
  const maxOrders=Math.max(...menu.map(m=>m.orderCount||0),1);

  /* ── Helpers ── */
  const toggleEnabled=(id)=>setMenu(p=>p.map(m=>m.id===id?{...m,enabled:m.enabled===false?true:false}:m));
  const adjustPrice=(id,factor)=>setMenu(p=>p.map(m=>{
    if(m.id!==id)return m;
    const base=m.basePrice||m.price;
    return {...m,price:+(base*factor).toFixed(2),basePrice:base};
  }));
  const resetPrice=(id)=>setMenu(p=>p.map(m=>m.id!==id?m:{...m,price:m.basePrice||m.price,basePrice:undefined}));
  const marginColor=(mg)=>mg>=60?C.green:mg>=40?C.amber:C.red;
  const marginBg=(mg)=>mg>=60?C.greenP:mg>=40?C.amberP:C.redP;

  /* ── Formules ── */
  const openFormula=(preset)=>{
    const sel={};
    preset.cats.forEach(cat=>{
      const first=menu.find(m=>m.cat===cat&&m.enabled!==false);
      if(first)sel[cat]=String(first.id);
    });
    setFSelections(sel);
    setFormulaModal(preset);
  };
  const saveFormula=()=>{
    if(!formulaModal)return;
    const items=Object.entries(fSelections).map(([cat,menuId])=>({cat,menuId:parseInt(menuId)}));
    const totalBase=items.reduce((s,item)=>{
      const d=menu.find(m=>m.id===item.menuId);
      return s+(d?.price||0);
    },0);
    const formulaPrice=+(totalBase*(1-formulaModal.discount)).toFixed(2);
    setFormulas(p=>[...p.filter(f=>f.presetId!==formulaModal.id),{
      id:Date.now(),presetId:formulaModal.id,name:formulaModal.name,
      icon:formulaModal.icon,items,active:true,
      price:formulaPrice,discount:formulaModal.discount,
    }]);
    setFormulaModal(null);
  };

  /* ── Édition ── */
  const del=()=>{setMenu(p=>p.filter(m=>m.id!==editId));setModal(false);};
  const openEdit=(m)=>{
    setEditId(m.id);
    setForm({name:m.name,cat:m.cat,price:String(m.price),prepTime:String(m.prepTime||"")});
    setIngLines((m.ingredients||[]).map(i=>({...i})));
    setNewIngS("");setNewIngQ("");setModal(true);
  };
  const addIngLine=()=>{
    const sid=parseInt(newIngS);const q=parseFloat(newIngQ);
    if(!sid||isNaN(q)||q<=0||ingLines.find(i=>i.stockId===sid))return;
    setIngLines(p=>[...p,{stockId:sid,qty:q}]);setNewIngS("");setNewIngQ("");
  };
  const removeIng=(sid)=>setIngLines(p=>p.filter(i=>i.stockId!==sid));
  const updateIngQty=(sid,val)=>setIngLines(p=>p.map(i=>i.stockId===sid?{...i,qty:parseFloat(val)||0}:i));
  const save=()=>{
    if(!form.name.trim()||!form.price)return;
    const item={name:form.name,cat:form.cat,price:parseFloat(form.price),prepTime:parseInt(form.prepTime)||60,ingredients:ingLines};
    if(editId)setMenu(p=>p.map(m=>m.id===editId?{...m,...item}:m));
    else setMenu(p=>[...p,{id:Date.now(),orderCount:0,enabled:true,...item}]);
    setModal(false);
  };

  const criticalDishes=menu.filter(m=>m.enabled!==false&&portionsLeft(m)<2&&portionsLeft(m)>=0&&(m.ingredients||[]).length>0);
  const disabledCount=menu.filter(m=>m.enabled===false).length;

  return(
    <div style={{background:theme.accent||C.bg,borderRadius:16,padding:16,transition:"background 0.4s"}}>

      {/* Bandeau thème */}
      {theme.id!=="none"&&(
        <div style={{background:theme.color+"18",border:`1.5px solid ${theme.color}33`,
          borderRadius:10,padding:"8px 14px",marginBottom:12,
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:18}}>{theme.icon}</span>
          <span style={{fontSize:12,fontWeight:700,color:theme.color,fontFamily:F.title}}>
            Thème : {theme.name}
          </span>
          <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>— {theme.desc}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {[`💰 ×${theme.priceMult}`,`⭐ Rép.+${theme.repBonus}`,`🎯 XP×${theme.xpMult}`].map(t=>(
              <span key={t} style={{fontSize:10,background:theme.color,color:"#fff",
                borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:700}}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Alertes stock critique */}
      {criticalDishes.length>0&&(
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,borderRadius:10,
          padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span>⚠️</span>
          <span style={{fontSize:12,fontWeight:700,color:C.red,fontFamily:F.body}}>
            {criticalDishes.length} plat{criticalDishes.length>1?"s":""} en stock critique :
          </span>
          {criticalDishes.map(m=>(
            <span key={m.id} style={{fontSize:10,background:C.red+"18",color:C.red,
              border:`1px solid ${C.red}33`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>
              {m.name}
              <button onClick={()=>toggleEnabled(m.id)}
                style={{marginLeft:5,background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:9,fontWeight:700,padding:0}}>
                Désactiver
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Sous-onglets */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {k:"carte",    icon:"📋", label:"Carte"},
          {k:"formules", icon:"🍽",  label:`Formules${(formulas||[]).filter(f=>f.active).length>0?" ("+(formulas||[]).filter(f=>f.active).length+")":""}`},
          {k:"themes",   icon:"🎨",  label:"Thèmes"},
          {k:"perf",     icon:"📊",  label:"Performance"},
        ].map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)} style={{
            padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
            background:mainTab===t.k?C.navy:"transparent",
            color:mainTab===t.k?"#fff":C.muted,
            border:`1.5px solid ${mainTab===t.k?C.navy:C.border}`,
            cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:5}}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ CARTE ══ */}
      {mainTab==="carte"&&(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{
                  background:catFilter===c?(catC[c]||C.green)+"1a":"transparent",
                  color:catFilter===c?(catC[c]||C.green):C.muted,
                  border:`1.5px solid ${catFilter===c?(catC[c]||C.green):C.border}`,
                  borderRadius:20,padding:"4px 12px",fontSize:12,
                  cursor:"pointer",fontFamily:F.body,fontWeight:500}}>
                  {c}
                </button>
              ))}
              {disabledCount>0&&(
                <span style={{fontSize:11,background:C.amberP,color:C.amber,
                  border:`1px solid ${C.amber}33`,borderRadius:20,padding:"4px 10px",
                  fontFamily:F.body,fontWeight:600}}>
                  ⏸ {disabledCount} désactivé{disabledCount>1?"s":""}
                </span>
              )}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>Trier :</span>
              {[
                {k:"cat",     label:"Cat."},
                {k:"margin",  label:"💰 Marge"},
                {k:"popular", label:"🔥 Pop."},
                {k:"stock",   label:"⚠ Stock"},
                {k:"score",   label:"📊 Score"},
              ].map(s=>(
                <button key={s.k} onClick={()=>setSortBy(s.k)} style={{
                  fontSize:10,padding:"3px 8px",borderRadius:6,
                  background:sortBy===s.k?C.navy:C.bg,
                  color:sortBy===s.k?"#fff":C.muted,
                  border:`1px solid ${sortBy===s.k?C.navy:C.border}`,
                  cursor:"pointer",fontFamily:F.body}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
            {sorted.map(m=>{
              const cc=catC[m.cat]||C.navy;
              const enabled=m.enabled!==false;
              const mg=dishMargin(m);
              const cost=dishCost(m);
              const portions=portionsLeft(m);
              const isTop=(m.orderCount||0)>0&&(m.orderCount||0)===maxOrders;
              const isPriceModified=m.basePrice&&m.basePrice!==m.price;
              const criticalStock=portions<2&&(m.ingredients||[]).length>0;
              const score=perfScore(m);
              const sc=score>=70?C.green:score>=40?C.amber:C.red;
              const effectivePrice=theme.priceMult!==1?+(m.price*theme.priceMult).toFixed(2):m.price;

              return(
                <div key={m.id} style={{
                  background:!enabled?C.bg:m.isSpecial?C.purpleP:C.card,
                  border:`1.5px solid ${!enabled?C.border:criticalStock?C.red+"55":m.isSpecial?C.purple+"66":cc+"44"}`,
                  borderRadius:14,padding:14,opacity:enabled?1:0.6,
                  boxShadow:criticalStock&&enabled?`0 0 0 2px ${C.red}22`:"0 1px 4px rgba(0,0,0,0.05)",
                  transition:"all 0.2s",position:"relative"}}>

                  {isTop&&enabled&&(
                    <div style={{position:"absolute",top:-8,right:10,
                      background:"linear-gradient(135deg,#f5a623,#e07a45)",
                      color:"#fff",fontSize:9,fontWeight:800,borderRadius:20,
                      padding:"2px 8px",boxShadow:"0 2px 6px rgba(0,0,0,0.2)"}}>
                      🔥 Top
                    </div>
                  )}

                  {/* Nom + prix */}
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:600,
                      color:enabled?C.ink:C.muted,fontFamily:F.title,
                      flex:1,lineHeight:1.3,paddingRight:6,
                      textDecoration:enabled?"none":"line-through"}}>
                      {m.name}
                    </div>
                    <div style={{flexShrink:0,textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:700,
                        color:isPriceModified?C.purple:theme.priceMult!==1?theme.color:C.terra,
                        fontFamily:F.title}}>
                        {effectivePrice}€
                      </div>
                      {(isPriceModified||theme.priceMult!==1)&&(
                        <div style={{fontSize:9,color:C.muted,textDecoration:"line-through",fontFamily:F.body}}>
                          {m.basePrice||m.price}€
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                    <Badge color={cc} sm>{m.cat}</Badge>
                    {m.prepTime&&<span style={{fontSize:9,background:C.amberP,color:C.amber,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>⏱{m.prepTime>=60?`${Math.floor(m.prepTime/60)}m`:m.prepTime+"s"}</span>}
                    {(m.ingredients||[]).length>0&&<span style={{fontSize:9,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600,background:criticalStock?C.redP:portions<5?C.amberP:C.greenP,color:criticalStock?C.red:portions<5?C.amber:C.green}}>{criticalStock?"⚠":"🍽"}{portions>=99?"∞":portions}p</span>}
                    {(m.orderCount||0)>0&&<span style={{fontSize:9,background:C.navyP,color:C.navy,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:600}}>📊{m.orderCount}</span>}
                    <span style={{fontSize:9,background:sc+"18",color:sc,border:`1px solid ${sc}33`,borderRadius:5,padding:"1px 5px",fontFamily:F.body,fontWeight:700}}>★{score}</span>
                  </div>

                  {/* Marge */}
                  {mg!==null&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                      background:marginBg(mg),border:`1px solid ${marginColor(mg)}22`,
                      borderRadius:7,padding:"5px 8px"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>Coût</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cost.toFixed(2)}€</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>Marge</div>
                        <div style={{fontSize:15,fontWeight:800,color:marginColor(mg),fontFamily:F.title}}>{mg}%</div>
                      </div>
                    </div>
                  )}

                  {/* Ingrédients */}
                  {(m.ingredients||[]).length>0&&(
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:6,marginBottom:8}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                        {m.ingredients.map(ing=>{
                          const s=stock.find(x=>x.id===ing.stockId);
                          const ok=s&&s.qty>=ing.qty;
                          return <span key={ing.stockId} style={{fontSize:9,fontFamily:F.body,background:ok?C.greenP:C.redP,color:ok?C.green:C.red,border:`1px solid ${ok?C.green:C.red}22`,borderRadius:4,padding:"1px 5px"}}>{s?.name||"?"} ×{ing.qty}</span>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:"flex",flexDirection:"column",gap:5}}>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      <span style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0}}>Prix :</span>
                      {[{l:"−10%",f:0.90,c:C.red},{l:"−5%",f:0.95,c:C.terra},{l:"+5%",f:1.05,c:C.green},{l:"+10%",f:1.10,c:C.green},{l:"+20%",f:1.20,c:C.purple}].map(({l,f,c})=>(
                        <button key={l} onClick={e=>{e.stopPropagation();adjustPrice(m.id,f);}} style={{flex:1,padding:"2px 0",fontSize:9,fontWeight:700,borderRadius:4,background:c+"14",color:c,border:`1px solid ${c}33`,cursor:"pointer",fontFamily:F.body}}>{l}</button>
                      ))}
                      {isPriceModified&&<button onClick={e=>{e.stopPropagation();resetPrice(m.id);}} style={{padding:"2px 5px",fontSize:9,fontWeight:700,borderRadius:4,background:C.navyP,color:C.navy,border:`1px solid ${C.navy}33`,cursor:"pointer",fontFamily:F.body}}>↺</button>}
                    </div>
                    <button onClick={e=>{e.stopPropagation();toggleEnabled(m.id);}} style={{width:"100%",padding:"4px",fontSize:10,fontWeight:700,borderRadius:6,background:enabled?C.amberP:C.greenP,color:enabled?C.amber:C.green,border:`1.5px solid ${enabled?C.amber:C.green}44`,cursor:"pointer",fontFamily:F.body}}>
                      {enabled?"⏸ Désactiver":"▶ Activer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══ FORMULES ══ */}
      {mainTab==="formules"&&(
        <div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:16,lineHeight:1.6}}>
            Les formules combinent plusieurs plats à prix réduit. Une fois configurées et activées, les clients les commandent automatiquement en priorité.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
            {FORMULA_PRESETS.map(preset=>{
              const existing=(formulas||[]).find(f=>f.presetId===preset.id);
              return(
                <div key={preset.id} style={{background:C.card,
                  border:`1.5px solid ${existing?.active?C.green+"55":C.border}`,
                  borderRadius:14,padding:16,
                  boxShadow:existing?.active?`0 2px 12px ${C.green}18`:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <span style={{fontSize:26}}>{preset.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>{preset.name}</div>
                      <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>{preset.desc}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(preset.discount*100)}%</div>
                      <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>réduction</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                    {preset.cats.map(cat=>(
                      <span key={cat} style={{fontSize:10,background:(catC[cat]||C.navy)+"14",color:catC[cat]||C.navy,border:`1px solid ${catC[cat]||C.navy}22`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>{cat}</span>
                    ))}
                  </div>
                  {existing&&(
                    <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:F.body,marginBottom:3}}>✓ {existing.price.toFixed(2)}€</div>
                      {existing.items.map(item=>{
                        const d=menu.find(m=>m.id===item.menuId);
                        return d?<div key={item.menuId} style={{fontSize:10,color:C.muted,fontFamily:F.body}}>· {d.name} ({d.price}€)</div>:null;
                      })}
                    </div>
                  )}
                  <div style={{display:"flex",gap:6}}>
                    <Btn sm v="primary" onClick={()=>openFormula(preset)}>{existing?"✏️ Modifier":"➕ Créer"}</Btn>
                    {existing&&<Btn sm v={existing.active?"terra":"primary"} onClick={()=>setFormulas(p=>p.map(f=>f.id!==existing.id?f:{...f,active:!f.active}))}>{existing.active?"⏸ Pause":"▶ Activer"}</Btn>}
                    {existing&&<Btn sm v="ghost" onClick={()=>setFormulas(p=>p.filter(f=>f.id!==existing.id))}>🗑</Btn>}
                  </div>
                </div>
              );
            })}
          </div>

          {formulaModal&&(
            <Modal title={`Configurer — ${formulaModal.name}`} onClose={()=>setFormulaModal(null)}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
                  Sélectionnez un plat par catégorie. Réduction : <strong style={{color:C.green}}>−{Math.round(formulaModal.discount*100)}%</strong>
                </div>
                {formulaModal.cats.map(cat=>(
                  <div key={cat}>
                    <Lbl>{cat}</Lbl>
                    <Sel value={fSelections[cat]||""} onChange={e=>setFSelections(p=>({...p,[cat]:e.target.value}))}>
                      <option value="">Choisir…</option>
                      {menu.filter(m=>m.cat===cat&&m.enabled!==false).map(m=>(
                        <option key={m.id} value={String(m.id)}>{m.name} — {m.price}€</option>
                      ))}
                    </Sel>
                  </div>
                ))}
                {formulaModal.cats.every(cat=>fSelections[cat])&&(()=>{
                  const total=formulaModal.cats.reduce((s,cat)=>{
                    const d=menu.find(m=>m.id===parseInt(fSelections[cat]));
                    return s+(d?.price||0);
                  },0);
                  const fp=+(total*(1-formulaModal.discount)).toFixed(2);
                  return(
                    <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>À la carte : <s>{total.toFixed(2)}€</s></div>
                        <div style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:F.title}}>Formule : {fp}€</div>
                      </div>
                      <div style={{fontSize:22,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(formulaModal.discount*100)}%</div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                  <Btn v="ghost" onClick={()=>setFormulaModal(null)}>Annuler</Btn>
                  <Btn v="primary" disabled={!formulaModal.cats.every(cat=>fSelections[cat])} onClick={saveFormula}>Enregistrer</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ══ THÈMES ══ */}
      {mainTab==="themes"&&(
        <div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:16,lineHeight:1.6}}>
            Le thème modifie visuellement la carte et applique un multiplicateur de prix global + bonus de réputation sur chaque service.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
            {MENU_THEMES.map(t=>{
              const isActive=(activeTheme||"none")===t.id;
              return(
                <div key={t.id} onClick={()=>setActiveTheme(t.id)} style={{
                  background:isActive?t.color+"14":C.card,
                  border:`2px solid ${isActive?t.color:C.border}`,
                  borderRadius:14,padding:16,cursor:"pointer",
                  boxShadow:isActive?`0 4px 16px ${t.color}33`:"0 1px 4px rgba(0,0,0,0.06)",
                  transition:"all 0.2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <div style={{width:44,height:44,background:t.color+"18",border:`2px solid ${t.color}44`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{t.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:t.color,fontFamily:F.title}}>
                        {t.name}
                        {isActive&&<span style={{marginLeft:6,fontSize:9,background:t.color,color:"#fff",borderRadius:20,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>Actif</span>}
                      </div>
                      <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>{t.desc}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[`💰 ×${t.priceMult}`,`⭐ +${t.repBonus} rép.`,`🎯 ×${t.xpMult} XP`].map(tag=>(
                      <span key={tag} style={{fontSize:10,background:t.color+"14",color:t.color,border:`1px solid ${t.color}33`,borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ PERFORMANCE ══ */}
      {mainTab==="perf"&&(
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
            {[
              {l:"Plats actifs",   v:menu.filter(m=>m.enabled!==false).length,      i:"✅",c:C.green, bg:C.greenP},
              {l:"Désactivés",     v:menu.filter(m=>m.enabled===false).length,       i:"⏸", c:C.amber, bg:C.amberP},
              {l:"CA généré",      v:menu.reduce((s,m)=>s+(m.price*(m.orderCount||0)),0).toFixed(0)+"€",i:"💶",c:C.terra, bg:C.terraP},
              {l:"Commandes total",v:menu.reduce((s,m)=>s+(m.orderCount||0),0),     i:"📊",c:C.navy,  bg:C.navyP},
            ].map(s=>(
              <div key={s.l} style={{background:s.bg,border:`1px solid ${s.c}22`,borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:3}}>{s.i}</div>
                <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Tableau */}
          <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>📊</span>
              <span style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>Tableau de performance — {menu.length} plats</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:560}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {["Plat","Cat.","Prix","Coût","Marge","Cmdes","CA","Stock","Score"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",fontSize:9,fontWeight:700,color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...menu].sort((a,b)=>perfScore(b)-perfScore(a)).map((m,i)=>{
                    const mg=dishMargin(m)||0;
                    const cost=dishCost(m);
                    const portions=portionsLeft(m);
                    const ca=+(m.price*(m.orderCount||0)).toFixed(2);
                    const score=perfScore(m);
                    const sc=score>=70?C.green:score>=40?C.amber:C.red;
                    const cc=catC[m.cat]||C.navy;
                    return(
                      <tr key={m.id} style={{background:i%2===0?C.card:C.bg,opacity:m.enabled===false?0.5:1}}>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.ink,whiteSpace:"nowrap"}}>{m.name}</div>
                          {m.enabled===false&&<span style={{fontSize:8,color:C.amber,fontWeight:700}}>⏸ off</span>}
                        </td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <span style={{fontSize:9,background:cc+"14",color:cc,border:`1px solid ${cc}22`,borderRadius:4,padding:"1px 5px",fontWeight:600}}>{m.cat}</span>
                        </td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.terra,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{m.price}€</td>
                        <td style={{padding:"8px 10px",fontSize:10,color:C.muted,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{cost.toFixed(2)}€</td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:36,height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(100,mg)}%`,background:marginColor(mg),borderRadius:99}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:700,color:marginColor(mg)}}>{mg}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.navy,borderBottom:`1px solid ${C.border}11`}}>{m.orderCount||0}</td>
                        <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.amber,borderBottom:`1px solid ${C.border}11`,whiteSpace:"nowrap"}}>{ca}€</td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <span style={{fontSize:10,fontWeight:600,color:portions<2?C.red:portions<5?C.amber:C.green}}>{portions>=99?"∞":portions}</span>
                        </td>
                        <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}11`}}>
                          <div style={{width:30,height:30,borderRadius:"50%",background:sc+"18",border:`2px solid ${sc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:sc}}>{score}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {modal&&(
        <Modal title={editId?"Modifier le plat":"Nouveau plat"} onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"end"}}>
              <div><Lbl>Nom du plat</Lbl><Inp value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
              <div style={{width:90}}><Lbl>Prix (€)</Lbl><Inp type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/></div>
              <div style={{width:100}}><Lbl>Prép. (sec)</Lbl><Inp type="number" value={form.prepTime} placeholder="60" onChange={e=>setForm(p=>({...p,prepTime:e.target.value}))}/></div>
            </div>
            <div><Lbl>Catégorie</Lbl>
              <Sel value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
                {["Entrées","Plats","Desserts","Boissons"].map(c=><option key={c}>{c}</option>)}
              </Sel>
            </div>
            <div style={{background:C.terraP,border:`1.5px solid ${C.terra}22`,borderRadius:12,padding:14}}>
              <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:12,fontFamily:F.body}}>🧂 Recette</div>
              {ingLines.length===0
                ?<div style={{fontSize:12,color:C.muted,fontStyle:"italic",fontFamily:F.body,marginBottom:12}}>Aucun ingrédient défini</div>
                :<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                  {ingLines.map(ing=>{
                    const s=stock.find(x=>x.id===ing.stockId);
                    const enough=s&&s.qty>=ing.qty;
                    return(
                      <div key={ing.stockId} style={{display:"flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${enough?C.border:C.red+"44"}`,borderRadius:8,padding:"7px 10px"}}>
                        <span style={{flex:1,fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body}}>{s?.name||"?"} <span style={{color:C.muted,fontWeight:400}}>({s?.unit})</span></span>
                        <input type="number" value={ing.qty} step="0.01" min="0.01" onChange={e=>updateIngQty(ing.stockId,e.target.value)}
                          style={{width:70,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 7px",fontSize:12,fontFamily:F.body,color:C.ink,textAlign:"right"}}/>
                        <span style={{fontSize:11,color:C.muted,fontFamily:F.body,minWidth:24}}>{s?.unit}</span>
                        {!enough&&<span style={{fontSize:10,color:C.red}}>⚠</span>}
                        <button onClick={()=>removeIng(ing.stockId)} style={{background:C.redP,border:`1px solid ${C.red}22`,borderRadius:6,color:C.red,cursor:"pointer",width:24,height:24,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>
                    );
                  })}
                </div>
              }
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <div style={{flex:1}}><Lbl>Élément primaire</Lbl>
                  <Sel value={newIngS} onChange={e=>setNewIngS(e.target.value)}>
                    <option value="">Choisir…</option>
                    {stock.filter(s=>!ingLines.find(i=>i.stockId===s.id)).map(s=>(
                      <option key={s.id} value={s.id}>{s.name} ({s.unit}) — {s.qty} en stock</option>
                    ))}
                  </Sel>
                </div>
                <div style={{width:80}}><Lbl>Qté</Lbl><Inp type="number" value={newIngQ} placeholder="0.0" onChange={e=>setNewIngQ(e.target.value)}/></div>
                <Btn v="terra" onClick={addIngLine} disabled={!newIngS||!newIngQ} icon="+">Ajouter</Btn>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
              <div>{editId&&<Btn v="danger" onClick={del}>Supprimer</Btn>}</div>
              <div style={{display:"flex",gap:10}}>
                <Btn onClick={()=>setModal(false)} v="ghost">Annuler</Btn>
                <Btn onClick={save} disabled={!form.name||!form.price}>Sauvegarder</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   STOCK VIEW
═══════════════════════════════════════════════════════ */
function StockView({stock,setStock,cash,setCash,addTx,kitchen,supplierMode,setSupplierMode,pendingDeliveries,setPendingDeliveries}){
  const storageMult=1+(kitchen?.upgrades?.stockage||0);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",qty:"",unit:"kg",alert:"",cat:"",price:""});
  const [editId,setEditId]=useState(null);
  const [adjId,setAdjId]=useState(null);
  const [adjV,setAdjV]=useState("");

  const alerts=stock.filter(s=>s.qty<=s.alert);

  const sup=SUPPLIERS[supplierMode||"premium"];
  // Deduct cost using supplier pricing; if delayed, schedule delivery
  const deductCost=(item,addedQty)=>{
    const unitPrice=(item.price||0)*(1-sup.discount);
    const cost=+(unitPrice*addedQty).toFixed(2);
    if(cost>0){
      setCash(c=>+Math.max(0,c-cost).toFixed(2));
      addTx("achat",`Achat ${item.name} — ${+addedQty.toFixed(3)} ${item.unit} (${sup.name})`,cost);
    }
    if(sup.delay>0){
      const label=`${item.name} ×${+addedQty.toFixed(3)} ${item.unit}`;
      setPendingDeliveries(p=>[...p,{
        id:Date.now()+Math.random(),
        items:[{stockId:item.id,qty:addedQty}],
        labels:label,
        arrivedAt:Date.now()+sup.delay*1000,
      }]);
      return false; // delayed — don't add to stock immediately
    }
    return true; // instant
  };

  const save=()=>{
    if(editId)setStock(p=>p.map(s=>s.id===editId
      ?{...s,...form,qty:+form.qty,alert:+form.alert,price:+(form.price||0)}:s));
    setModal(false);
    setEditId(null);
    setForm({name:"",qty:"",unit:"kg",alert:"",cat:"",price:""});
  };
  const applyAdj=(id)=>{
    const v=parseFloat(adjV);
    if(isNaN(v))return;
    const item=stock.find(s=>s.id===id);
    let doAdd=true;
    if(v>0 && item){const instant=deductCost(item,v);if(!instant)doAdd=false;}
    if(doAdd)setStock(p=>p.map(s=>s.id===id?{...s,qty:Math.max(0,+(s.qty+v).toFixed(3))}:s));
    setAdjId(null);setAdjV("");
  };

  // Unit-aware quick-add presets
  const quickAmounts=unit=>{
    if(["kg","L"].includes(unit))   return [0.5,1,5];
    if(["btl","pcs","bottes"].includes(unit)) return [1,6,12];
    if(unit==="u")                  return [6,12,24];
    return [1,5,10];
  };

  // Restock all low items to alert*4
  const restockAll=()=>{
    let anyInstant=false;
    stock.filter(s=>s.qty<=s.alert).forEach(s=>{
      const added=+(s.alert*4-s.qty).toFixed(3);
      if(added>0){const inst=deductCost(s,added);if(inst)anyInstant=true;}
    });
    if(sup.delay===0)setStock(p=>p.map(s=>s.qty<=s.alert?{...s,qty:+(s.alert*4).toFixed(2)}:s));
  };

  // Group by category
  const cats=[...new Set(stock.map(s=>s.cat))];
  const catIcon={Viandes:"🥩",Poissons:"🐟",Fins:"⭐",Légumes:"🥦","Légumes & Herbes":"🌿",
    Herbes:"🌿",Laitiers:"🧈",Épicerie:"🫙",Boissons:"🍷"};

  return(
    <div>
      {/* Supplier toggle */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,
        padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{fontSize:18}}>🚛</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:2}}>
            Mode d'approvisionnement
          </div>
          <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
            {SUPPLIERS[supplierMode||"premium"].desc}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {Object.values(SUPPLIERS).map(s=>{
            const active=(supplierMode||"premium")===s.id;
            return(
              <button key={s.id} onClick={()=>setSupplierMode(s.id)} style={{
                padding:"7px 14px",fontSize:11,fontWeight:600,
                background:active?C.navy:C.bg,
                border:`1.5px solid ${active?C.navy:C.border}`,
                borderRadius:8,color:active?C.white:C.muted,
                cursor:"pointer",fontFamily:F.body,
                display:"flex",alignItems:"center",gap:5}}>
                <span>{s.icon}</span>
                <span>{s.name}</span>
                {s.discount>0&&<span style={{fontSize:9,background:"#ffffff33",
                  borderRadius:4,padding:"1px 4px"}}>−{(s.discount*100).toFixed(0)}%</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending deliveries */}
      {pendingDeliveries&&pendingDeliveries.length>0&&(
        <div style={{background:C.navyP,border:`1.5px solid ${C.navy}33`,borderRadius:12,
          padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy,fontFamily:F.title,marginBottom:8,
            display:"flex",alignItems:"center",gap:6}}>
            <span>🚚</span>
            <span>{pendingDeliveries.length} livraison{pendingDeliveries.length>1?"s":""} en cours</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pendingDeliveries.map(d=>{
              const secsLeft=Math.max(0,Math.ceil((d.arrivedAt-Date.now())/1000));
              const pct=Math.max(0,Math.min(100,100-(secsLeft/120)*100));
              return(
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,fontSize:11,color:C.navy,fontFamily:F.body,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {d.labels}
                  </div>
                  <div style={{width:80,height:5,background:C.border,borderRadius:99,overflow:"hidden",flexShrink:0}}>
                    <div style={{height:"100%",borderRadius:99,background:C.navy,
                      width:`${pct}%`,transition:"width 1s linear"}}/>
                  </div>
                  <span style={{fontSize:10,color:C.navy,fontWeight:600,fontFamily:F.body,
                    flexShrink:0,minWidth:28}}>{secsLeft}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert banner */}
      {alerts.length>0&&(
        <div style={{background:C.redP,border:`1.5px solid ${C.red}33`,
          borderRadius:12,padding:"12px 16px",marginBottom:20,
          display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:18}}>⚠️</span>
          <span style={{color:C.red,fontWeight:700,fontSize:13,fontFamily:F.body,flexShrink:0}}>
            {alerts.length} alerte{alerts.length>1?"s":""} stock bas
          </span>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",flex:1}}>
            {alerts.map(a=>(
              <span key={a.id} style={{background:C.red+"18",color:C.red,
                border:`1px solid ${C.red}33`,borderRadius:6,padding:"3px 10px",
                fontSize:11,fontFamily:F.body,fontWeight:600}}>
                {a.name} : {+(a.qty).toFixed(2)} {a.unit}
              </span>
            ))}
          </div>
          <button onClick={restockAll} style={{
            flexShrink:0,padding:"7px 14px",fontSize:12,fontWeight:700,
            background:C.terra,border:"none",borderRadius:8,
            color:C.white,cursor:"pointer",fontFamily:F.body}}>
            ⟳ Tout réapprovisionner
          </button>
        </div>
      )}

      {/* Categories */}
      {cats.map(cat=>{
        const items=stock.filter(s=>s.cat===cat);
        return(
          <div key={cat} style={{marginBottom:28}}>
            {/* Category header */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>{catIcon[cat]||"📦"}</span>
              <span style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>{cat}</span>
              <div style={{flex:1,height:1,background:C.border,marginLeft:4}}/>
            </div>

            {/* Item cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
              {items.map(it=>{
                const low=it.qty<=it.alert;
                // Fixed cap: alert*6, never shrinks with usage
                const cap=(it.alert>0?it.alert*6:Math.max(it.qty*2,10))*storageMult;
                const pct=cap>0?Math.min(100,(it.qty/cap)*100):0;
                const alertPct=cap>0?Math.min(100,(it.alert/cap)*100):0;
                const barColor=pct<=alertPct?C.red:pct<=alertPct*2.5?C.amber:C.green;
                const amounts=quickAmounts(it.unit);

                return(
                  <div key={it.id} style={{
                    background:low?C.redP:C.card,
                    border:`1.5px solid ${low?C.red+"55":C.border}`,
                    borderRadius:14,padding:14,
                    boxShadow:low?`0 2px 14px ${C.red}20`:"0 1px 5px rgba(0,0,0,0.06)",
                    cursor:"pointer",transition:"all 0.15s"}}
                    className="hovcard"
                    onClick={()=>{setEditId(it.id);setForm({
                      name:it.name,
                      qty:String(it.qty),
                      unit:it.unit,
                      alert:String(it.alert),
                      cat:it.cat,
                      price:String(it.price||0),
                    });setModal(true);}}>

                    {/* Name + alert badge */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.body,flex:1,lineHeight:1.3}}>
                        {it.name}
                      </div>
                      {low
                        ?<span style={{fontSize:10,color:C.red,fontWeight:700,fontFamily:F.body,
                            flexShrink:0,marginLeft:6,background:C.red+"18",
                            border:`1px solid ${C.red}33`,borderRadius:5,padding:"2px 6px"}}>
                          ⚠ Bas
                        </span>
                        :<span style={{fontSize:10,color:C.green,fontWeight:600,fontFamily:F.body,
                            flexShrink:0,marginLeft:6,background:C.greenP,
                            border:`1px solid ${C.green}33`,borderRadius:5,padding:"2px 6px"}}>
                          ✓ OK
                        </span>
                      }
                    </div>

                    {/* Visual fill gauge */}
                    <div style={{marginBottom:6}}>
                      <div style={{height:22,background:C.bg,border:`1px solid ${C.border}`,
                        borderRadius:8,overflow:"hidden",position:"relative"}}>
                        <div style={{position:"absolute",top:0,left:0,bottom:0,
                          width:`${pct}%`,background:barColor,
                          borderRadius:7,transition:"width 0.4s ease",opacity:0.9}}/>
                        {/* Alert marker */}
                        <div style={{position:"absolute",top:0,bottom:0,
                          left:`${alertPct}%`,width:2,
                          background:C.red+"99"}}/>
                        {/* Label */}
                        <div style={{position:"absolute",inset:0,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:11,fontWeight:700,fontFamily:F.body,
                          color:pct>25?C.surface:C.ink,
                          textShadow:pct>25?"0 1px 3px rgba(0,0,0,0.35)":"none"}}>
                          {+(it.qty).toFixed(2)} {it.unit}
                        </div>
                      </div>
                    </div>

                    {/* Scale labels */}
                    <div style={{display:"flex",justifyContent:"space-between",
                      fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                      <span>0</span>
                      <span style={{color:C.red}}>⚑ {it.alert}</span>
                      <span>{cap} {it.unit}</span>
                    </div>
                    {/* Price */}
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:10}}>
                      💶 {(it.price||0).toFixed(2)} € / {it.unit}
                    </div>

                    {/* Quick add buttons */}
                    {adjId===it.id?(
                      <div style={{display:"flex",gap:6,alignItems:"center"}}
                        onClick={e=>e.stopPropagation()}>
                        <Inp type="number" value={adjV} onChange={e=>setAdjV(e.target.value)}
                          placeholder="+/-" style={{flex:1,fontSize:12,padding:"5px 8px"}}/>
                        <Btn sm v="primary" onClick={()=>applyAdj(it.id)}>OK</Btn>
                        <Btn sm v="ghost" onClick={()=>setAdjId(null)}>✕</Btn>
                      </div>
                    ):(
                      <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                        {amounts.map(n=>{
                          const wouldExceed=it.qty+n>cap;
                          return(
                          <button key={n} onClick={()=>{
                            if(wouldExceed)return;
                            deductCost(it,n);
                            setStock(p=>p.map(s=>s.id===it.id
                              ?{...s,qty:Math.min(cap,+(s.qty+n).toFixed(3))}:s));
                          }}
                            disabled={wouldExceed}
                            style={{flex:1,padding:"5px 0",fontSize:11,fontWeight:700,
                              background:wouldExceed?C.bg:C.greenP,
                              border:`1px solid ${wouldExceed?C.border:C.green}33`,
                              borderRadius:7,
                              color:wouldExceed?C.muted:C.green,
                              cursor:wouldExceed?"not-allowed":"pointer",
                              fontFamily:F.body,lineHeight:1,
                              opacity:wouldExceed?0.45:1}}>
                            +{n}
                          </button>
                          );
                        })}
                        <button onClick={()=>setAdjId(it.id)}
                          style={{flex:"0 0 28px",padding:"5px 0",fontSize:12,fontWeight:700,
                            background:C.navyP,border:`1px solid ${C.navy}33`,
                            borderRadius:7,color:C.navy,cursor:"pointer"}}>
                          ±
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit modal */}
      {modal&&(
        <Modal title="Modifier le produit" onClose={()=>{setModal(false);setEditId(null);setForm({name:"",qty:"",unit:"kg",alert:"",cat:""});}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body}}>
              {form.name} <span style={{color:C.ink,fontWeight:600}}>({form.unit})</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Lbl>Alerte minimum</Lbl><Inp type="number" value={form.alert} onChange={e=>setForm(p=>({...p,alert:e.target.value}))}/></div>
              <div><Lbl>Prix d'achat (€/{form.unit})</Lbl><Inp type="number" step="0.01" value={form.price||""} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/></div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
              <Btn onClick={()=>{setModal(false);setEditId(null);setForm({name:"",qty:"",unit:"kg",alert:"",cat:""});}} v="ghost">Annuler</Btn>
              <Btn onClick={save}>Sauvegarder</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPLAINTS VIEW
═══════════════════════════════════════════════════════ */
function ComplaintsView({complaints,setComplaints,tables,servers,seenIds}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({date:"",table:"",server:"",type:"Qualité plat",desc:"",status:"nouveau",prio:"moyenne"});
  const [filter,setFilter]=useState("Tout");
  const types=["Qualité plat","Délai service","Attitude personnel","Facture incorrecte","Propreté","Autre"];
  const filtered=[...(filter==="Tout"?complaints:complaints.filter(c=>c.status===filter))].sort((a,b)=>b.date.localeCompare(a.date));
  const save=()=>{
    setComplaints(p=>[...p,{id:Date.now(),...form,table:+form.table}]);
    setModal(false);
  };
  const cnt={
    nouveau:complaints.filter(c=>c.status==="nouveau").length,
    "en cours":complaints.filter(c=>c.status==="en cours").length,
    résolu:complaints.filter(c=>c.status==="résolu").length,
  };
  const prioC={haute:C.red,moyenne:C.terra,basse:C.navy};
  const statC={résolu:C.green,"en cours":C.amber,nouveau:C.red};
  const statBg={résolu:C.greenP,"en cours":C.amberP,nouveau:C.redP};
  return(
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{color:C.muted,fontSize:13,fontStyle:"italic",fontFamily:F.body,padding:"16px 0"}}>
            Aucune plainte dans cette catégorie.
          </div>
        )}
        {filtered.map(c=>(
          <Card key={c.id} accent={(statC[c.status]||C.muted)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <Badge color={prioC[c.prio]||C.muted} sm>{c.prio}</Badge>
                  <Badge color={statC[c.status]||C.muted} bg={statBg[c.status]||C.bg} sm>
                    {c.status}
                  </Badge>
                  {!seenIds?.has(c.id)&&c.status==="nouveau"&&(
                    <span style={{
                      background:C.red,color:"#fff",
                      fontSize:9,fontWeight:800,letterSpacing:"0.06em",
                      borderRadius:4,padding:"2px 7px",fontFamily:F.body,
                      textTransform:"uppercase",animation:"pulse 1.2s infinite"}}>
                      ● NOUVEAU
                    </span>
                  )}
                  <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                    Table {c.table} · {c.server} · {c.date}
                  </span>
                </div>
                <div style={{fontWeight:600,color:C.ink,fontSize:14,marginBottom:4,fontFamily:F.title}}>
                  {c.type}
                </div>
                <div style={{color:C.muted,fontSize:13,fontFamily:F.body}}>{c.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title="Signaler une plainte" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Lbl>Date</Lbl><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
              <div>
                <Lbl>Table</Lbl>
                <Sel value={form.table} onChange={e=>setForm(p=>({...p,table:e.target.value}))}>
                  <option value="">Sélectionner…</option>
                  {tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>Serveur</Lbl>
              <Sel value={form.server} onChange={e=>setForm(p=>({...p,server:e.target.value}))}>
                <option value="">Sélectionner…</option>
                {servers.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Type</Lbl>
              <Sel value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                {types.map(t=><option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <Lbl>Priorité</Lbl>
                <Sel value={form.prio} onChange={e=>setForm(p=>({...p,prio:e.target.value}))}>
                  <option value="basse">Basse</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="haute">Haute</option>
                </Sel>
              </div>
              <div>
                <Lbl>Statut</Lbl>
                <Sel value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="nouveau">Nouveau</option>
                  <option value="en cours">En cours</option>
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>Description</Lbl>
              <textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} rows={3}
                style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,
                  padding:"9px 13px",color:C.ink,fontSize:13,fontFamily:F.body,
                  outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
              <Btn onClick={()=>setModal(false)} v="ghost">Annuler</Btn>
              <Btn onClick={save} v="terra">Enregistrer</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HELP MODAL — Guide utilisateur
═══════════════════════════════════════════════════════ */
const HELP_SECTIONS=[
  {
    icon:"⊞", title:"Tables",
    color:"#2a5c3f",
    items:[
      {q:"Arrivée des clients",a:"Un nouveau groupe arrive toutes les 30 secondes (65 % de chance). La taille du groupe ne dépasse jamais la capacité maximale des tables libres. La file d'attente reste active même si vous changez d'onglet."},
      {q:"Humeur et patience",a:"🤩 Enthousiaste (45s, ×1.5 XP) · 😊 Détendu (35s) · 😐 Neutre (25s) · 😑 Pressé (18s) · 😤 Impatient (11s, ×0.6 XP). La barre de patience passe du vert au rouge — si elle atteint 0, le groupe part sans consommer."},
      {q:"Placement automatique",a:"Si une table libre et un serveur actif sont disponibles, cliquez sur ▶ Placer pour installer le groupe. La commande est générée et le serveur part la prendre."},
      {q:"Prise de commande",a:"Le serveur prend la commande selon la taille du groupe : 30s (2 personnes), 1 min (4 personnes), 1m30 (6 personnes). La carte affiche 🛎 prise de commande avec un compte à rebours. La commande part en cuisine à la fin."},
      {q:"Repas en cours",a:"Une fois les plats servis, la table passe en 🍴 repas en cours. Le temps de repas correspond aux ⅔ du temps du plat le plus long. Le bouton Encaisser est verrouillé pendant ce délai."},
      {q:"Nettoyage",a:"Après l'encaissement, un serveur libre nettoie la table pendant 1 minute (🧹 nettoyage). La table redevient libre automatiquement."},
      {q:"Agrandir une table",a:"Sur chaque table libre, un bouton permet d'augmenter la capacité : 2→4 couverts pour 800 €, puis 4→6 couverts pour 1 800 €. Maximum 6 couverts. Des groupes plus grands arriveront une fois les tables agrandies."},
      {q:"Niveau des tables",a:"Chaque encaissement fait progresser la table (6 niveaux : 🪑 Basique → 🏆 Légendaire). Les tables de niveau élevé multiplient les gains d'XP."},
    ]
  },
  {
    icon:"👤", title:"Serveurs",
    color:"#1c3352",
    items:[
      {q:"Équipe de départ",a:"Le restaurant démarre avec deux serveurs : Marie Dupont (14 €/h) et Pierre Martin (12 €/h). Le nombre de serveurs est fixe."},
      {q:"Statuts",a:"Actif → disponible. En pause → indisponible, non payé. 🛎 En service → prend une commande ou nettoie (durée variable). Seuls les serveurs actifs sont assignés automatiquement."},
      {q:"Durée de service",a:"Prise de commande : 30s (2p), 1 min (4p), 1m30 (6p). Nettoyage : toujours 1 minute. Un serveur en service ne peut pas être mis en pause ni réassigné."},
      {q:"Expérience et niveau",a:"Les serveurs gagnent 50 % de l'XP de chaque encaissement. 5 niveaux : 🎓 Stagiaire → 👑 Maître."},
      {q:"Salaire",a:"Les serveurs actifs sont payés toutes les heures réelles. Les serveurs en pause ou au repos ne sont pas payés."},
    ]
  },
  {
    icon:"👨‍🍳", title:"Cuisine",
    color:"#c4622d",
    items:[
      {q:"File d'attente",a:"Les tickets arrivent en cuisine après le délai de prise de commande. Ils s'ajoutent dans l'ordre d'arrivée."},
      {q:"Feux de cuisson",a:"4 feux simultanés de base, +1 par commis débloqué. Cliquez sur ▶ Démarrer ou « Tout démarrer » pour lancer les cuissons disponibles."},
      {q:"Temps de cuisson",a:"Réduit par le niveau du chef (×1.0 à ×3.0) et les commis (+15 % chacun). La barre de progression affiche le temps restant en mm:ss."},
      {q:"Servir une table",a:"Quand tous les plats d'une table sont prêts (✅), le bouton 🍽 Servir apparaît. La table passe en phase repas (⅔ du temps du plat le plus long) avant encaissement."},
      {q:"Chef et commis",a:"Le chef gagne +12 XP par plat terminé. Les commis gagnent +40 % de ce montant. Commis supplémentaires débloqués aux niveaux 2 et 4 du chef."},
    ]
  },
  {
    icon:"📋", title:"Menu",
    color:"#5c4a8a",
    items:[
      {q:"Cartes des plats",a:"Chaque carte affiche le nom, le prix, le temps de préparation ⏱ et les ingrédients. Badge vert = stock suffisant, rouge = stock insuffisant."},
      {q:"Modifier un plat",a:"Cliquez sur une carte pour modifier le nom, la catégorie, le prix, le temps de préparation (en secondes) et la recette."},
      {q:"Temps de préparation",a:"Exprimé en secondes. Les plats principaux prennent entre 75s et 180s. Ce temps est réduit par le chef et les commis à la cuisson."},
    ]
  },
  {
    icon:"📦", title:"Stocks",
    color:"#1c3352",
    items:[
      {q:"Vue par catégorie",a:"Les produits sont regroupés par catégorie. Chaque carte affiche une jauge avec le niveau actuel, le seuil d'alerte (⚑) et la capacité maximale."},
      {q:"Acheter des ingrédients",a:"Boutons rapides pour réapprovisionner. Le coût est déduit de la caisse immédiatement. Les ingrédients sont consommés au démarrage de chaque cuisson."},
      {q:"Boutons grisés",a:"Un bouton est grisé si l'ajout dépasserait le stock maximum autorisé."},
      {q:"Tout réapprovisionner",a:"Le bouton ⟳ dans la bannière d'alerte remonte tous les produits en rupture à 4× leur seuil en un clic."},
      {q:"Alertes",a:"Quand une quantité tombe sous le seuil, la carte passe en rouge et le badge ⚠ s'affiche dans la navigation."},
    ]
  },
  {
    icon:"🎯", title:"Objectifs",
    color:"#b87d10",
    items:[
      {q:"Séries d'objectifs",a:"16 objectifs en 4 séries : Premiers pas, Croissance, Excellence, Légende. Chaque série est plus exigeante que la précédente."},
      {q:"Conditions",a:"Les objectifs couvrent : tables servies, chiffre d'affaires, tables agrandies et niveaux de restaurant débloqués."},
      {q:"Récompenses",a:"Chaque objectif complété donne des espèces et de l'XP restaurant. Cliquez sur Récupérer pour encaisser."},
      {q:"Badge et notifications",a:"Un badge numérique apparaît sur l'onglet 🎯 dès qu'une récompense est prête. Appuyez sur le toast pour ouvrir directement l'onglet."},
    ]
  },
  {
    icon:"💰", title:"Finances",
    color:"#b87d10",
    items:[
      {q:"Caisse",a:"Le restaurant démarre avec 5 000 €. Affiché dans le header : vert si ≥ 200 €, rouge si critique."},
      {q:"Recettes",a:"Chaque encaissement crédite la caisse du montant de l'addition."},
      {q:"Dépenses",a:"Achats de stock et agrandissements de tables déduits en temps réel. Salaires prélevés toutes les heures réelles."},
      {q:"Grand livre",a:"Cliquez sur 💰 dans le header pour voir toutes les transactions avec le résumé Recettes / Dépenses / Résultat net."},
    ]
  },
  {
    icon:"📊", title:"Statistiques",
    color:"#2a5c3f",
    items:[
      {q:"Données journalières",a:"Les 5 derniers jours : clients servis, clients perdus et revenus par jour."},
      {q:"Taux de service",a:"Barre de progression par jour : vert ≥ 80 %, orange ≥ 50 %, rouge < 50 %."},
      {q:"Graphiques",a:"Barres visuelles pour les revenus et la répartition servis/perdus, mises à jour en temps réel."},
    ]
  },
  {
    icon:"⚠", title:"Plaintes",
    color:"#c4622d",
    items:[
      {q:"Liste des plaintes",a:"Triées de la plus récente à la plus ancienne. Badge ● NOUVEAU sur les plaintes non encore consultées."},
      {q:"Indicateur non lu",a:"Le badge ● NOUVEAU disparaît dès que vous ouvrez l'onglet Plaintes ou cliquez sur l'alerte 💬 dans le header."},
      {q:"Alerte header",a:"L'alerte 💬 indique le nombre de nouvelles plaintes. Cliquez dessus pour aller directement à l'onglet — elle disparaît ensuite."},
    ]
  },
  {
    icon:"🏆", title:"Niveau Restaurant",
    color:"#b87d10",
    items:[
      {q:"Progression",a:"Chaque encaissement ajoute de l'XP. La barre dans le header indique l'avancement vers le niveau suivant."},
      {q:"Déblocage des tables",a:"☕ Café (3) → 🍺 Bistrot (5) → 🍽 Brasserie (7) → ⭐ Restaurant (9) → 🌟 Grand Restaurant (11) → 👑 Palace (12)."},
      {q:"Toasts de navigation",a:"Chaque toast est cliquable et vous amène directement à l'onglet concerné. Un hint ↗ indique les toasts navigables."},
    ]
  },
];

function HelpModal({onClose}){
  const [sec,setSec]=useState(0);
  const s=HELP_SECTIONS[sec];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:780,
        maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,background:C.green,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              ❓
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>Guide utilisateur</div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Toutes les fonctionnalités expliquées</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:8,
            width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Sidebar */}
          <div style={{width:170,borderRight:`1px solid ${C.border}`,padding:"12px 8px",
            display:"flex",flexDirection:"column",gap:3,flexShrink:0,overflowY:"auto",
            background:C.bg}}>
            {HELP_SECTIONS.map((hs,i)=>(
              <button key={i} onClick={()=>setSec(i)} style={{
                background:sec===i?hs.color+"18":"transparent",
                border:`1.5px solid ${sec===i?hs.color+"44":"transparent"}`,
                borderRadius:9,padding:"9px 11px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:9,
                color:sec===i?hs.color:C.muted,
                fontWeight:sec===i?700:400,
                fontSize:12,fontFamily:F.body,textAlign:"left",
                transition:"all 0.15s"}}>
                <span style={{fontSize:16,flexShrink:0}}>{hs.icon}</span>
                <span>{hs.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <span style={{fontSize:26}}>{s.icon}</span>
              <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:F.title}}>{s.title}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {s.items.map((it,i)=>(
                <div key={i} style={{background:C.card,border:`1.5px solid ${s.color}22`,
                  borderLeft:`4px solid ${s.color}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:s.color,
                    fontFamily:F.body,marginBottom:6}}>
                    {it.q}
                  </div>
                  <div style={{fontSize:12,color:C.ink,fontFamily:F.body,
                    lineHeight:1.6}}>
                    {it.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   DAILY SUMMARY MODAL — Résumé de fin de journée (A)
═══════════════════════════════════════════════════════ */
function DailySummaryModal({onClose,dailyStats,objStats,servers,menu,transactions,prevRecord,isRecord}){
  const today=dailyStats[dailyStats.length-1]||{served:0,lost:0,revenue:0,date:""};
  const totalClients=today.served+today.lost;
  const rate=totalClients>0?Math.round((today.served/totalClients)*100):0;
  const rateColor=rate>=80?C.green:rate>=50?C.amber:C.red;

  // Meilleur serveur (plus de XP total)
  const bestSrv=[...servers].sort((a,b)=>b.totalXp-a.totalXp)[0];

  // Plat le plus commandé (depuis les transactions du jour)
  const dishCount={};
  transactions.filter(t=>t.type==="revenu"&&t.label.includes("×")).forEach(t=>{
    const m=t.label.match(/(\d+)× ([^,)]+)/g);
    if(m) m.forEach(s=>{
      const [,q,n]=s.match(/(\d+)× (.+)/);
      dishCount[n]=(dishCount[n]||0)+parseInt(q);
    });
  });
  const topDish=Object.entries(dishCount).sort((a,b)=>b[1]-a[1])[0];

  // Objectif du lendemain
  const nextRevTarget=[500,1000,2000,5000,10000].find(t=>t>objStats.totalRevenue)||10000;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:10050,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:22,width:"100%",maxWidth:460,
        boxShadow:"0 32px 80px rgba(0,0,0,0.35)",overflow:"hidden",
        animation:"popIn 0.4s ease"}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${C.green},${C.greenL})`,
          padding:"24px 28px 20px",textAlign:"center",position:"relative"}}>
          {isRecord&&(
            <div style={{position:"absolute",top:12,right:16,
              background:"#f5d878",color:"#7a5a00",borderRadius:20,
              padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.06em"}}>
              🏆 RECORD !
            </div>
          )}
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",fontFamily:F.title}}>
            Bilan de la journée
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",fontFamily:F.body,marginTop:4}}>
            {today.date}
          </div>
        </div>

        {/* Stats principales */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
          borderBottom:`1px solid ${C.border}`}}>
          {[
            {icon:"✅",val:today.served,label:"Servis",color:C.green,bg:C.greenP},
            {icon:"😤",val:today.lost,label:"Perdus",color:C.red,bg:C.redP},
            {icon:"💶",val:today.revenue.toFixed(0)+"€",label:"Revenus",color:C.amber,bg:C.amberP},
          ].map(s=>(
            <div key={s.label} style={{background:s.bg,padding:"16px 10px",textAlign:"center",
              borderRight:`1px solid ${C.border}`}}>
              <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:800,color:s.color,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Taux de service */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:11,fontFamily:F.body,marginBottom:6}}>
              <span style={{color:C.muted}}>Taux de service</span>
              <span style={{fontWeight:700,color:rateColor}}>{rate}%</span>
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${rate}%`,background:rateColor,
                borderRadius:99,transition:"width 1s ease"}}/>
            </div>
          </div>

          {/* Meilleur serveur + plat */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {bestSrv&&(
              <div style={{background:C.navyP,border:`1px solid ${C.navy}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>⭐ Meilleur serveur</div>
                <div style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:F.title}}>{bestSrv.name}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{bestSrv.totalXp} XP</div>
              </div>
            )}
            {topDish&&(
              <div style={{background:C.terraP,border:`1px solid ${C.terra}22`,
                borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:4}}>🍽 Plat n°1</div>
                <div style={{fontSize:13,fontWeight:700,color:C.terra,fontFamily:F.title,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topDish[0]}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>{topDish[1]}× commandé</div>
              </div>
            )}
          </div>

          {/* Objectif demain */}
          <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
            borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>🎯</span>
            <div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>Objectif demain</div>
              <div style={{fontSize:13,fontWeight:700,color:C.purple,fontFamily:F.title}}>
                Atteindre {nextRevTarget.toLocaleString("fr-FR")} € de CA total
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {(nextRevTarget-objStats.totalRevenue).toLocaleString("fr-FR")} € restants
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{
            padding:"12px",borderRadius:12,border:"none",
            background:C.green,color:"#fff",cursor:"pointer",
            fontSize:14,fontWeight:700,fontFamily:F.body,
            boxShadow:`0 4px 16px ${C.green}44`}}>
            Continuer →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STATS VIEW — Dashboard redesigné (B)
═══════════════════════════════════════════════════════ */
function StatsView({dailyStats,loan,objStats,restoXp,kitchen,servers,reputation=50}){
  const days=[...dailyStats].reverse();
  const maxRevenue=Math.max(...days.map(d=>d.revenue),1);
  const maxClients=Math.max(...days.map(d=>d.served+d.lost),1);
  const rl=restoLv(restoXp||0);
  const rlD=rl.d;
  const nextRl=rl.next;
  const cl=chefLv(kitchen?.chef?.totalXp||0);
  const clD=CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
  const repTier=getRepTier(reputation);
  const nextRepTier=REP_THRESHOLDS.find(t=>t.min>reputation);
  const prevRepTier=[...REP_THRESHOLDS].reverse().find(t=>t.min<(repTier.min));

  const nextObj=OBJECTIVES_DEF.find(o=>!(objStats?.completedIds||[]).includes(o.id)&&!o.condition(objStats||{}));

  return(
    <div style={{maxWidth:900,margin:"0 auto",padding:"10px 0"}}>

      {/* ── Réputation Hero ─────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg,${repTier.color}14,${repTier.color}06)`,
        border:`2px solid ${repTier.color}33`,borderRadius:18,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          {/* Gauge circulaire */}
          <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
            <svg width={80} height={80} style={{transform:"rotate(-90deg)"}}>
              <circle cx={40} cy={40} r={32} fill="none" stroke={C.border} strokeWidth={8}/>
              <circle cx={40} cy={40} r={32} fill="none" stroke={repTier.color} strokeWidth={8}
                strokeDasharray={`${2*Math.PI*32}`}
                strokeDashoffset={`${2*Math.PI*32*(1-reputation/100)}`}
                strokeLinecap="round"
                style={{transition:"stroke-dashoffset 0.8s ease"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:22,lineHeight:1}}>{repTier.icon}</span>
              <span style={{fontSize:10,fontWeight:800,color:repTier.color,
                fontFamily:F.title,lineHeight:1}}>{Math.round(reputation)}</span>
            </div>
          </div>

          {/* Texte */}
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:20,fontWeight:800,color:repTier.color,
              fontFamily:F.title,marginBottom:4}}>{repTier.label}</div>
            <div style={{fontSize:12,color:C.muted,fontFamily:F.body,
              lineHeight:1.5,marginBottom:10}}>{repTier.desc}</div>
            {/* Effets actifs */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,background:repTier.tipMult>=1?C.greenP:C.redP,
                color:repTier.tipMult>=1?C.green:C.red,
                border:`1px solid ${repTier.tipMult>=1?C.green:C.red}33`,
                borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>
                💸 Pourboires ×{repTier.tipMult}
              </span>
              <span style={{fontSize:11,background:repTier.spawnMult>=1?C.greenP:C.redP,
                color:repTier.spawnMult>=1?C.green:C.red,
                border:`1px solid ${repTier.spawnMult>=1?C.green:C.red}33`,
                borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>
                🚶 Clients ×{repTier.spawnMult}
              </span>
            </div>
          </div>

          {/* Paliers */}
          <div style={{flexShrink:0,minWidth:160}}>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8,fontWeight:600,
              textTransform:"uppercase",letterSpacing:"0.06em"}}>Paliers</div>
            {REP_THRESHOLDS.slice().reverse().map(t=>(
              <div key={t.min} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                <div style={{width:8,height:8,borderRadius:"50%",
                  background:reputation>=t.min?t.color:C.border,
                  border:`1.5px solid ${t.color}`,
                  boxShadow:reputation>=t.min&&repTier.min===t.min?`0 0 0 3px ${t.color}33`:"none",
                  flexShrink:0,transition:"all 0.3s"}}/>
                <span style={{fontSize:10,fontFamily:F.body,
                  fontWeight:repTier.min===t.min?700:400,
                  color:repTier.min===t.min?t.color:C.muted}}>
                  {t.icon} {t.label} ({t.min}+)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Barre de progression vers palier suivant */}
        {nextRepTier&&(
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${repTier.color}22`}}>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:5}}>
              <span>Vers <strong style={{color:nextRepTier.color}}>{nextRepTier.icon} {nextRepTier.label}</strong></span>
              <span style={{color:repTier.color,fontWeight:700}}>
                {Math.round(nextRepTier.min-reputation)} pts restants
              </span>
            </div>
            <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:repTier.color,
                width:`${Math.round(((reputation-(repTier.min))/(nextRepTier.min-repTier.min))*100)}%`,
                transition:"width 0.8s ease"}}/>
            </div>
          </div>
        )}
        {!nextRepTier&&(
          <div style={{marginTop:10,textAlign:"center",fontSize:12,color:repTier.color,
            fontWeight:700,fontFamily:F.body}}>
            {repTier.icon} Réputation maximale atteinte !
          </div>
        )}
      </div>

      {/* ── Progression Hero ────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>

        {/* Restaurant XP */}
        <div style={{background:`linear-gradient(135deg,${rlD.color}18,${C.surface})`,
          border:`2px solid ${rlD.color}33`,borderRadius:18,padding:"18px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,background:rlD.color+"22",border:`2px solid ${rlD.color}44`,
              borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
              {rlD.icon}
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:2}}>Restaurant</div>
              <div style={{fontSize:17,fontWeight:800,color:rlD.color,fontFamily:F.title}}>{rlD.name}</div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{fontSize:24,fontWeight:800,color:rlD.color,fontFamily:F.title,lineHeight:1}}>N{rlD.l}</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>/{RESTO_LVL.length-1}</div>
            </div>
          </div>
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,
              color:C.muted,fontFamily:F.body,marginBottom:5}}>
              <span style={{color:rlD.color,fontWeight:600}}>{restoXp||0} XP</span>
              <span>{rl.l<RESTO_LVL.length-1?`${nextRl.xpNeeded} XP pour ${nextRl.name}`:"✦ Niveau max"}</span>
            </div>
            <div style={{height:10,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${rl.pct||0}%`,background:rlD.color,
                borderRadius:99,transition:"width 0.8s ease"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:10}}>
            {RESTO_LVL.map((r,i)=>(
              <div key={i} style={{width:20,height:20,borderRadius:6,
                background:i<=rl.l?r.color:"#e0d8cc",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,title:r.name,
                boxShadow:i===rl.l?`0 0 0 2px ${r.color}66`:"none",
                transition:"all 0.3s"}}>
                {i<=rl.l?r.icon:""}
              </div>
            ))}
          </div>
        </div>

        {/* Chef XP */}
        <div style={{background:`linear-gradient(135deg,${clD.color}18,${C.surface})`,
          border:`2px solid ${clD.color}33`,borderRadius:18,padding:"18px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,background:clD.color+"22",border:`2px solid ${clD.color}44`,
              borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
              {clD.icon}
            </div>
            <div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:2}}>{kitchen?.chef?.name||"Chef"}</div>
              <div style={{fontSize:17,fontWeight:800,color:clD.color,fontFamily:F.title}}>{clD.name}</div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{fontSize:24,fontWeight:800,color:clD.color,fontFamily:F.title,lineHeight:1}}>N{cl.l}</div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>/{CHEF_LVL.length-1}</div>
            </div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,
              color:C.muted,fontFamily:F.body,marginBottom:5}}>
              <span style={{color:clD.color,fontWeight:600}}>{cl.r} XP</span>
              <span>{cl.l<CHEF_LVL.length-1?`${cl.n} XP pour niveau suivant`:"✦ Niveau max"}</span>
            </div>
            <div style={{height:10,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",
                width:`${cl.l<CHEF_LVL.length-1?Math.min(100,Math.round(cl.r/cl.n*100)):100}%`,
                background:clD.color,borderRadius:99,transition:"width 0.8s ease"}}/>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,background:clD.color+"18",color:clD.color,
              border:`1px solid ${clD.color}33`,borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>
              ⚡ ×{clD.speed} vitesse
            </span>
            <span style={{fontSize:10,background:C.navyP,color:C.navy,
              border:`1px solid ${C.navy}22`,borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>
              🧑‍🍳 {clD.commis} commis
            </span>
          </div>
        </div>
      </div>

      {/* ── Prochain objectif ────────────────────────────── */}
      {nextObj&&(
        <div style={{background:C.purpleP,border:`1.5px solid ${C.purple}33`,
          borderRadius:14,padding:"14px 18px",marginBottom:20,
          display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:28,flexShrink:0}}>{nextObj.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:2}}>🎯 Prochain objectif</div>
            <div style={{fontSize:14,fontWeight:700,color:C.purple,fontFamily:F.title}}>{nextObj.title}</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>{nextObj.desc}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:12,color:C.amber,fontWeight:700,fontFamily:F.body}}>💶 +{nextObj.reward.cash}€</div>
            <div style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>⭐ +{nextObj.reward.xp} XP</div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:24}}>
        {[
          {label:"Clients servis",val:days.reduce((s,d)=>s+d.served,0),icon:"✅",c:C.green,bg:C.greenP},
          {label:"Clients perdus",val:days.reduce((s,d)=>s+d.lost,0),icon:"😤",c:C.red,bg:C.redP},
          {label:"CA total",val:objStats?.totalRevenue?.toFixed(0)+"€"||"0€",icon:"💶",c:C.amber,bg:C.amberP},
          {label:"Note moyenne",val:objStats?.ratingCount>0?(objStats.totalRating/objStats.ratingCount).toFixed(1)+" ★":"—",icon:"⭐",c:C.purple,bg:C.purpleP},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,border:`1.5px solid ${s.c}22`,
            borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:F.title,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Prêt bancaire ────────────────────────────────── */}
      {loan&&(
        <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:14,
          padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <span style={{fontSize:22}}>🏦</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title}}>
              Prêt en cours — {loan.label}
            </div>
            <div style={{fontSize:11,color:C.ink,fontFamily:F.body,marginTop:2}}>
              Restant dû : <strong>{loan.remaining.toFixed(2)} €</strong>&nbsp;·&nbsp;{loan.repayPerHour} €/h
            </div>
          </div>
          <div style={{height:8,width:180,background:C.border,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,background:C.amber,
              width:`${Math.max(2,100-loan.remaining/(loan.amount*(1+loan.rate))*100)}%`}}/>
          </div>
        </div>
      )}

      {/* ── Graphiques ───────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16}}>💶 Revenus / jour</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",height:110}}>
            {[...dailyStats].slice(-5).map((d,i)=>{
              const h=maxRevenue>0?Math.round((d.revenue/maxRevenue)*100):2;
              const isToday=i===dailyStats.slice(-5).length-1;
              return(
                <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,color:C.amber,fontWeight:700,fontFamily:F.body,textAlign:"center"}}>
                    {d.revenue>0?`${Math.round(d.revenue)}€`:""}
                  </div>
                  <div style={{width:"100%",height:`${Math.max(h,3)}px`,
                    background:isToday?C.amber:`${C.amber}88`,
                    borderRadius:"5px 5px 0 0",transition:"height 0.6s ease",
                    border:isToday?`1px solid ${C.amber}`:"none"}}/>
                  <div style={{fontSize:8,color:isToday?C.amber:C.muted,fontFamily:F.body,
                    fontWeight:isToday?700:400,textAlign:"center"}}>
                    {d.date.slice(0,5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16}}>👥 Clients / jour</div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",height:110}}>
            {[...dailyStats].slice(-5).map((d,i)=>{
              const isToday=i===dailyStats.slice(-5).length-1;
              const hs=maxClients>0?Math.round((d.served/maxClients)*100):0;
              const hl=maxClients>0?Math.round((d.lost/maxClients)*100):0;
              return(
                <div key={d.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"stretch",gap:1}}>
                    {hl>0&&<div style={{height:`${hl}px`,background:`${C.red}${isToday?"":"88"}`,borderRadius:"4px 4px 0 0"}}/>}
                    {hs>0&&<div style={{height:`${hs}px`,background:`${C.green}${isToday?"":"88"}`,borderRadius:hl===0?"4px 4px 0 0":"0"}}/>}
                    {hs===0&&hl===0&&<div style={{height:3,background:C.border}}/>}
                  </div>
                  <div style={{fontSize:8,color:isToday?C.ink:C.muted,fontFamily:F.body,fontWeight:isToday?700:400,textAlign:"center"}}>
                    {d.date.slice(0,5)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:10}}>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted,fontFamily:F.body}}>
              <div style={{width:10,height:10,background:C.green,borderRadius:2}}/>Servis
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted,fontFamily:F.body}}>
              <div style={{width:10,height:10,background:C.red,borderRadius:2}}/>Perdus
            </div>
          </div>
        </div>
      </div>

      {/* ── Tableau journalier ───────────────────────────── */}
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:15}}>📅</span>
          <span style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>5 derniers jours</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:F.body,minWidth:400}}>
            <thead>
              <tr style={{background:C.bg}}>
                {["Date","✅ Servis","😤 Perdus","Taux","💶 Revenus"].map(h=>(
                  <th key={h} style={{padding:"10px 16px",fontSize:11,fontWeight:700,
                    color:C.muted,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d,i)=>{
                const total=d.served+d.lost;
                const rate=total>0?Math.round((d.served/total)*100):0;
                const rc=rate>=80?C.green:rate>=50?C.amber:C.red;
                return(
                  <tr key={d.date} style={{background:i===0?C.greenP:i%2===0?C.card:C.bg}}>
                    <td style={{padding:"11px 16px",fontSize:12,fontWeight:i===0?700:500,
                      color:C.ink,borderBottom:`1px solid ${C.border}11`}}>
                      {d.date}{i===0&&<span style={{marginLeft:6,fontSize:9,background:C.green,
                        color:"#fff",borderRadius:4,padding:"1px 6px",fontWeight:700}}>Auj.</span>}
                    </td>
                    <td style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}11`}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.green}}>{d.served}</span>
                    </td>
                    <td style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}11`}}>
                      <span style={{fontSize:13,fontWeight:700,color:d.lost>0?C.red:C.muted}}>{d.lost}</span>
                    </td>
                    <td style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}11`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:60,height:7,background:C.border,borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${rate}%`,background:rc,borderRadius:4}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:rc}}>{total>0?`${rate}%`:"—"}</span>
                      </div>
                    </td>
                    <td style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}11`}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.amber}}>
                        {d.revenue.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function BankModal({onClose,cash,loan,setLoan,setCash,addTx,addToast}){
  const takeLoan=(opt)=>{
    if(loan){addToast({icon:"🏦",title:"Prêt en cours",msg:"Remboursez d'abord votre emprunt actuel.",color:C.red});return;}
    const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
    setLoan({id:opt.id,label:opt.label,amount:opt.amount,remaining:totalDue,
      rate:opt.rate,takenAt:Date.now(),repayPerHour:opt.monthly});
    setCash(c=>+(c+opt.amount).toFixed(2));
    addTx("revenu",`Prêt bancaire — ${opt.label} (${opt.amount}€)`,opt.amount);
    addToast({icon:"🏦",title:`Prêt accordé — +${opt.amount} €`,
      msg:`Remboursement : ${opt.monthly}€/h · Total : ${totalDue}€`,color:C.navy,tab:"stats"});
    onClose();
  };
  const repayNow=()=>{
    if(!loan)return;
    if(cash<loan.remaining){addToast({icon:"❌",title:"Fonds insuffisants",msg:`Il vous manque ${(loan.remaining-cash).toFixed(2)}€`,color:C.red});return;}
    setCash(c=>+(c-loan.remaining).toFixed(2));
    addTx("remboursement",`Remboursement anticipé — ${loan.label}`,loan.remaining);
    addToast({icon:"🎉",title:"Prêt soldé !",msg:"Votre emprunt est entièrement remboursé.",color:C.green,tab:"stats"});
    setLoan(null);
    onClose();
  };
  return(
    <Modal title="🏦 Banque" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>

        {/* Active loan status */}
        {loan?(
          <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.amber,fontFamily:F.title,marginBottom:8}}>
              📋 Prêt en cours — {loan.label}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Montant initial",v:`${loan.amount.toFixed(2)} €`},
                {l:"Restant dû",v:`${loan.remaining.toFixed(2)} €`,c:C.red},
                {l:"Mensualité",v:`${loan.repayPerHour.toFixed(0)} €/h`},
                {l:"Taux",v:`${(loan.rate*100).toFixed(1)} %`},
              ].map(r=>(
                <div key={r.l} style={{background:C.surface,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:2}}>{r.l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:r.c||C.ink,fontFamily:F.title}}>{r.v}</div>
                </div>
              ))}
            </div>
            <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",borderRadius:99,background:C.amber,
                width:`${Math.max(0,100-(loan.remaining/loan.amount/(1+loan.rate))*100)}%`,
                transition:"width 0.4s"}}/>
            </div>
            <Btn full v="primary" onClick={repayNow}
              icon={cash>=loan.remaining?"💸":"🔒"}>
              {cash>=loan.remaining?`Rembourser en avance (${loan.remaining.toFixed(2)} €)`:"Fonds insuffisants"}
            </Btn>
          </div>
        ):(
          <div style={{background:C.greenP,border:`1px solid ${C.green}33`,
            borderRadius:10,padding:"10px 14px",fontSize:12,color:C.green,fontFamily:F.body}}>
            ✅ Aucun emprunt actif — vous pouvez contracter un prêt.
          </div>
        )}

        {/* Loan options */}
        <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>Nouveaux prêts disponibles</div>
        {LOAN_OPTIONS.map(opt=>{
          const totalDue=+(opt.amount*(1+opt.rate)).toFixed(2);
          const disabled=!!loan;
          return(
            <div key={opt.id} style={{background:disabled?C.bg:C.card,
              border:`1.5px solid ${disabled?C.border:C.navy+"44"}`,
              borderRadius:12,padding:"14px 16px",opacity:disabled?0.55:1,
              display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28,flexShrink:0}}>{opt.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:3}}>
                  {opt.label} — {opt.amount.toLocaleString("fr-FR")} €
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                  Taux {(opt.rate*100).toFixed(1)}% · Mensualités {opt.monthly}€/h · Total dû {totalDue}€
                </div>
              </div>
              <Btn v={disabled?"disabled":"primary"} onClick={()=>!disabled&&takeLoan(opt)}>
                Emprunter
              </Btn>
            </div>
          );
        })}

        {/* Fine print */}
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center",lineHeight:1.5}}>
          Les mensualités sont déduites automatiquement chaque heure. En cas d'insolvabilité,
          le remboursement est différé jusqu'à disponibilité des fonds.
        </div>
      </div>
    </Modal>
  );
}
function ObjectivesView({objStats,completedIds,onClaim,pendingClaim,todayChallenges,challengeProgress,challengeClaimed,setChallengeClaimed,challengeLostToday,setCash,addTx,addRestoXp,addToast,restoXp,restoLvN}){
  const series=["Revenus","Clients","Niveau","Salle"];

  const claimChallenge=(ch)=>{
    if(challengeClaimed[ch.id])return;
    setChallengeClaimed(p=>({...p,[ch.id]:true}));
    setCash(c=>+(c+ch.reward.cash).toFixed(2));
    addTx("revenu",`Défi quotidien : ${ch.title}`,ch.reward.cash);
    addRestoXp(ch.reward.xp);
    addToast({icon:ch.icon,title:`Défi complété — +${ch.reward.cash}€`,
      msg:`${ch.title} · +${ch.reward.xp} XP`,color:C.purple,tab:"objectives"});
  };

  const getChallengeValue=(ch)=>{
    if(ch.key==="noLoss")return challengeLostToday?0:1;
    return challengeProgress[ch.key]||0;
  };

  return(
    <div style={{maxWidth:800,margin:"0 auto",padding:"10px 0"}}>

      {/* ── Daily challenges ── */}
      <div style={{background:C.purpleP,border:`1.5px solid ${C.purple}33`,
        borderRadius:16,padding:"18px 20px",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:20}}>🎯</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.purple,fontFamily:F.title}}>Défis du jour</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Renouvelés chaque jour · récompenses immédiates</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(todayChallenges||[]).map(ch=>{
            const val=getChallengeValue(ch);
            const done=val>=ch.target;
            const claimed=!!(challengeClaimed||{})[ch.id];
            const pct=Math.min(100,Math.round((val/ch.target)*100));
            return(
              <div key={ch.id} style={{
                background:claimed?C.greenP:done?C.purple+"18":C.surface,
                border:`1.5px solid ${claimed?C.green+"55":done?C.purple:C.border}`,
                borderRadius:12,padding:"12px 16px",
                display:"flex",alignItems:"center",gap:12,
                transition:"all 0.2s"}}>
                <span style={{fontSize:24,flexShrink:0,filter:claimed?"grayscale(1)":"none"}}>{ch.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,
                      color:claimed?C.muted:done?C.purple:C.ink,
                      fontFamily:F.title}}>
                      {ch.title}
                    </span>
                    {claimed&&<span style={{fontSize:10,background:C.green,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>✓ Réclamé</span>}
                    {done&&!claimed&&<span style={{fontSize:10,background:C.purple,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                      animation:"pulse 1s infinite"}}>🎉 Complété !</span>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>{ch.desc}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,
                        background:claimed?C.green:done?C.purple:C.amber,
                        width:`${pct}%`,transition:"width 0.4s"}}/>
                    </div>
                    <span style={{fontSize:10,color:done?C.purple:C.muted,
                      fontWeight:done?700:400,fontFamily:F.body,flexShrink:0}}>
                      {ch.key==="noLoss"?(challengeLostToday?"✗":"✓"):
                       ch.key==="fullHouse"?(val>=1?"✓":"En attente"):
                       ch.key==="vip"?(val>=1?"✓":"En attente"):
                       `${typeof val==="number"&&ch.key==="revenue"?val.toFixed(0):val}/${ch.target}`}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",flexShrink:0}}>
                  <span style={{fontSize:11,color:C.amber,fontWeight:700,fontFamily:F.body}}>💶 +{ch.reward.cash}€</span>
                  <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>⭐ +{ch.reward.xp} XP</span>
                  {done&&!claimed&&(
                    <button onClick={()=>claimChallenge(ch)} style={{
                      background:C.purple,color:"#fff",border:"none",
                      borderRadius:8,padding:"6px 14px",cursor:"pointer",
                      fontFamily:F.body,fontWeight:700,fontSize:12,marginTop:4,
                      boxShadow:`0 3px 10px ${C.purple}55`}}>
                      Réclamer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Jalons de progression ── */}
      {(()=>{
        const milestones=[
          {label:"10 clients",key:"totalServed",target:10,icon:"👥"},
          {label:"50 clients",key:"totalServed",target:50,icon:"🔥"},
          {label:"1k€ CA",key:"totalRevenue",target:1000,icon:"💶"},
          {label:"5k€ CA",key:"totalRevenue",target:5000,icon:"💰"},
          {label:"20k€ CA",key:"totalRevenue",target:20000,icon:"🏆"},
          {label:"Palace",key:"restoLevel",target:5,icon:"👑"},
        ];
        const vals={totalServed:objStats?.totalServed||0,totalRevenue:objStats?.totalRevenue||0,restoLevel:restoLvN||0};
        return(
          <div style={{background:C.card,border:`1.5px solid ${C.border}`,
            borderRadius:16,padding:"18px 20px",marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16,
              display:"flex",alignItems:"center",gap:8}}>
              <span>🗺</span> Jalons de progression
            </div>
            <div style={{display:"flex",alignItems:"center",gap:0,position:"relative"}}>
              {/* connecting line */}
              <div style={{position:"absolute",top:"50%",left:"5%",right:"5%",height:3,
                background:C.border,borderRadius:99,transform:"translateY(-50%)",zIndex:0}}/>
              {milestones.map((m,i)=>{
                const val=vals[m.key]||0;
                const done=val>=m.target;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                    position:"relative",zIndex:1}}>
                    <div style={{width:36,height:36,borderRadius:"50%",
                      background:done?C.amber:C.bg,
                      border:`3px solid ${done?C.amber:C.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:done?16:14,marginBottom:6,
                      boxShadow:done?`0 0 0 4px ${C.amber}33`:"none",
                      transition:"all 0.3s"}}>
                      {done?m.icon:"○"}
                    </div>
                    <div style={{fontSize:9,color:done?C.amber:C.muted,fontFamily:F.body,
                      fontWeight:done?700:400,textAlign:"center",lineHeight:1.3}}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Summary bar */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
        {series.map(s=>{
          const all=OBJECTIVES_DEF.filter(o=>o.series===s);
          const done=all.filter(o=>completedIds.includes(o.id)).length;
          const pct=Math.round(done/all.length*100);
          const col=SERIES_COLORS[s];
          return(
            <div key={s} style={{background:col+"14",border:`1.5px solid ${col}22`,
              borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:col,fontFamily:F.title}}>{done}/{all.length}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>{SERIES_LABELS[s]}</div>
              <div style={{background:C.border,borderRadius:99,height:5}}>
                <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:99,transition:"width 0.4s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Objectives by series */}
      {series.map(s=>{
        const objs=OBJECTIVES_DEF.filter(o=>o.series===s);
        const col=SERIES_COLORS[s];
        return(
          <div key={s} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:3,height:20,background:col,borderRadius:99}}/>
              <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:F.title}}>
                {SERIES_LABELS[s]}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {objs.map(obj=>{
                const done=completedIds.includes(obj.id);
                const isPending=pendingClaim.includes(obj.id);
                return(
                  <div key={obj.id} style={{
                    background:isPending?col+"18":done?C.greenP:C.card,
                    border:`1.5px solid ${isPending?col:done?C.green+"44":C.border}`,
                    borderRadius:12,padding:"14px 16px",
                    display:"flex",alignItems:"center",gap:14,
                    opacity:done&&!isPending?0.6:1,
                    transition:"all 0.2s"}}>
                    {/* Icon */}
                    <div style={{fontSize:28,flexShrink:0,
                      filter:done&&!isPending?"grayscale(1)":"none"}}>{obj.icon}</div>

                    {/* Text */}
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:isPending?col:done?C.muted:C.ink,
                          fontFamily:F.title}}>
                          {obj.title}
                        </span>
                        {done&&!isPending&&(
                          <span style={{fontSize:10,background:C.green,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>
                            ✓ Complété
                          </span>
                        )}
                        {isPending&&(
                          <span style={{fontSize:10,background:col,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                            animation:"pulse 1s infinite"}}>
                            🎉 À récupérer !
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                        {obj.desc}
                      </div>
                      <div style={{display:"flex",gap:10}}>
                        <span style={{fontSize:11,color:C.amber,fontFamily:F.body,fontWeight:600}}>
                          💶 +{obj.reward.cash} €
                        </span>
                        <span style={{fontSize:11,color:C.green,fontFamily:F.body,fontWeight:600}}>
                          ⭐ +{obj.reward.xp} XP resto
                        </span>
                      </div>
                    </div>

                    {/* Claim button */}
                    {isPending&&(
                      <button onClick={()=>onClaim(obj.id)} style={{
                        background:col,color:"#fff",border:"none",
                        borderRadius:10,padding:"10px 18px",cursor:"pointer",
                        fontFamily:F.body,fontWeight:700,fontSize:13,flexShrink:0,
                        boxShadow:`0 4px 14px ${col}55`}}>
                        Récupérer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


const TABS=[
  {id:"tables",     label:"Tables",      icon:"⊞"},
  {id:"servers",    label:"Serveurs",    icon:"👤"},
  {id:"cuisine",    label:"Cuisine",     icon:"👨‍🍳"},
  {id:"menu",       label:"Menu",        icon:"📋"},
  {id:"stock",      label:"Stocks",      icon:"📦"},
  {id:"objectives", label:"Objectifs",   icon:"🎯"},
  {id:"complaints", label:"Plaintes",    icon:"⚠"},
  {id:"stats",      label:"Statistiques",icon:"📊"},
];

/* ── Objectifs de progression ── */
const OBJECTIVES_DEF=[
  // Série : Revenus
  {id:"rev1",  series:"Revenus",    icon:"💶", title:"Premiers euros",      desc:"Encaisser 500€",          reward:{cash:50,  xp:100}, condition:s=>(s.totalRevenue||0)>=500  },
  {id:"rev2",  series:"Revenus",    icon:"💶", title:"Bistrot rentable",     desc:"Encaisser 2 000€",        reward:{cash:150, xp:250}, condition:s=>(s.totalRevenue||0)>=2000 },
  {id:"rev3",  series:"Revenus",    icon:"💶", title:"Restaurant prospère",  desc:"Encaisser 10 000€",       reward:{cash:500, xp:600}, condition:s=>(s.totalRevenue||0)>=10000},
  {id:"rev4",  series:"Revenus",    icon:"💶", title:"Empire culinaire",     desc:"Encaisser 50 000€",       reward:{cash:2000,xp:1500},condition:s=>(s.totalRevenue||0)>=50000},
  // Série : Clients
  {id:"srv1",  series:"Clients",    icon:"🍽", title:"Premier service",      desc:"Servir 10 clients",       reward:{cash:30,  xp:80 }, condition:s=>(s.totalServed||0)>=10   },
  {id:"srv2",  series:"Clients",    icon:"🍽", title:"Service régulier",     desc:"Servir 50 clients",       reward:{cash:80,  xp:200}, condition:s=>(s.totalServed||0)>=50   },
  {id:"srv3",  series:"Clients",    icon:"🍽", title:"Grande salle comble",  desc:"Servir 200 clients",      reward:{cash:300, xp:500}, condition:s=>(s.totalServed||0)>=200  },
  {id:"srv4",  series:"Clients",    icon:"🍽", title:"Institution locale",   desc:"Servir 1 000 clients",    reward:{cash:1000,xp:1200},condition:s=>(s.totalServed||0)>=1000 },
  // Série : Niveau resto
  {id:"lvl1",  series:"Niveau",     icon:"⭐", title:"Bistrot étoilé",       desc:"Atteindre le niveau 2",   reward:{cash:200, xp:300}, condition:s=>(s.restoLevel||0)>=2     },
  {id:"lvl2",  series:"Niveau",     icon:"⭐", title:"Brasserie reconnue",   desc:"Atteindre le niveau 3",   reward:{cash:500, xp:600}, condition:s=>(s.restoLevel||0)>=3     },
  {id:"lvl3",  series:"Niveau",     icon:"⭐", title:"Grand restaurant",     desc:"Atteindre le niveau 4",   reward:{cash:1200,xp:1000},condition:s=>(s.restoLevel||0)>=4     },
  {id:"lvl4",  series:"Niveau",     icon:"👑", title:"Palace gastronomique", desc:"Atteindre le niveau 5",   reward:{cash:3000,xp:2000},condition:s=>(s.restoLevel||0)>=5     },
  // Série : Tables
  {id:"tbl1",  series:"Salle",      icon:"🪑", title:"Première extension",   desc:"Agrandir 1 table",        reward:{cash:50,  xp:80 }, condition:s=>(s.tablesUpgraded||0)>=1 },
  {id:"tbl2",  series:"Salle",      icon:"🪑", title:"Salle réaménagée",     desc:"Agrandir 3 tables",       reward:{cash:120, xp:200}, condition:s=>(s.tablesUpgraded||0)>=3 },
];

/* ── Défis quotidiens ── */
const ALL_CHALLENGES=[
  {id:"ch_served",   key:"served",   icon:"🍽", title:"Service express",      desc:"Servir 10 clients aujourd'hui",            target:10,  reward:{cash:80, xp:120}},
  {id:"ch_revenue",  key:"revenue",  icon:"💶", title:"Journée dorée",        desc:"Encaisser 500€ dans la journée",           target:500, reward:{cash:100,xp:150}},
  {id:"ch_rating",   key:"highRating",icon:"⭐",title:"Service 5 étoiles",    desc:"Obtenir 5 notes ≥ 4★",                    target:5,   reward:{cash:60, xp:100}},
  {id:"ch_noloss",   key:"noLoss",   icon:"😊", title:"Zéro abandon",         desc:"Aucun client ne repart sans être servi",   target:1,   reward:{cash:70, xp:90 }},
  {id:"ch_fast",     key:"fastPlace",icon:"⚡", title:"Placement rapide",     desc:"Placer 8 groupes en un clic",              target:8,   reward:{cash:50, xp:80 }},
  {id:"ch_vip",      key:"vip",      icon:"🎩", title:"Service VIP",          desc:"Servir un client VIP",                     target:1,   reward:{cash:150,xp:200}},
  {id:"ch_tips",     key:"tips",     icon:"💰", title:"Maître du pourboire",  desc:"Encaisser 50€ de pourboires",              target:50,  reward:{cash:60, xp:100}},
  {id:"ch_fullhouse",key:"fullHouse",icon:"🏠", title:"Salle comble",         desc:"Avoir 5 tables occupées simultanément",    target:1,   reward:{cash:90, xp:130}},
];

const pickDailyChallenges=(dateStr)=>{
  // Seed déterministe à partir de la date → même défis pour toute la journée
  const seed=dateStr.split("/").reduce((acc,n,i)=>acc+parseInt(n)*(i+1),0);
  const shuffled=[...ALL_CHALLENGES].sort((a,b)=>{
    const ha=(seed*17+a.id.charCodeAt(3))%100;
    const hb=(seed*17+b.id.charCodeAt(3))%100;
    return ha-hb;
  });
  return shuffled.slice(0,3);
};

export default function App(){
  const _today = new Date().toLocaleDateString("fr-FR");

  /* ── États principaux — initialisés avec les valeurs par défaut ── */
  /* La sauvegarde est chargée de façon asynchrone dans le useEffect  */
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab,setTab]=useState("tables");
  const [tables,setTables]=useState(TABLES0);
  const [servers,setServers]=useState(SERVERS0);
  const [queue,setQueue]=useState(()=>{
    const mood=rMood();
    return [{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}];
  });
  const [waitlist,setWaitlist]=useState([]); // groupes partis mais rappelables 2 min
  const [menu,setMenu]=useState(MENU0);
  const [stock,setStock]=useState(STOCK0);
  const [formulas,setFormulas]=useState([]); // [{id, presetId, name, items:[{menuId,cat}], active}]
  const [activeTheme,setActiveTheme]=useState("none");
  const [complaints,setComplaints]=useState(COMPLAINTS0);
  const [kitchen,setKitchen]=useState(KITCHEN0);
  const [toasts,setToasts]=useState([]);
  const [restoXp,setRestoXp]=useState(0);
  const [cash,setCash]=useState(5000);
  const [transactions,setTransactions]=useState([
    {id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}
  ]);
  const [showLedger,setShowLedger]=useState(false);
  const [showBank,setShowBank]=useState(false);
  const [loan,setLoan]=useState(null);
  const [supplierMode,setSupplierMode]=useState("premium");
  const [pendingDeliveries,setPendingDeliveries]=useState([]);
  const [dailySpecials,setDailySpecials]=useState(()=>{
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    return picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true}));
  });
  const [activeEvent,setActiveEvent]=useState(null);
  const [completedIds,setCompletedIds]=useState([]);
  const [challengeDate,setChallengeDate]=useState(_today);
  const [todayChallenges,setTodayChallenges]=useState(()=>pickDailyChallenges(_today));
  const [challengeProgress,setChallengeProgress]=useState({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
  const [challengeClaimed,setChallengeClaimed]=useState({});
  const [challengeLostToday,setChallengeLostToday]=useState(false);
  const [pendingClaim,setPendingClaim]=useState([]);
  const [objStats,setObjStats]=useState({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
  const [dailyStats,setDailyStats]=useState([{date:_today,served:0,lost:0,revenue:0}]);
  const [reputation,setReputation]=useState(50); // 0–100

  /* ── Indicateur de sauvegarde ──────────────────────── */
  const [saveStatus,setSaveStatus]=useState("idle");
  const saveTimerRef=useRef(null);
  const [showResetModal,setShowResetModal]=useState(false);
  const [showSummary,setShowSummary]=useState(false);
  const [summaryIsRecord,setSummaryIsRecord]=useState(false);
  const prevRevenueRef=useRef(0);
  // Résumé de fin de journée : s'affiche après 10 min de jeu réel
  const summaryShownRef=useRef(false);
  useEffect(()=>{
    if(!isLoaded) return;
    const t=setTimeout(()=>{
      if(summaryShownRef.current) return;
      summaryShownRef.current=true;
      const today=dailyStats[dailyStats.length-1];
      const isRecord=today&&today.revenue>prevRevenueRef.current&&today.revenue>0;
      setSummaryIsRecord(isRecord);
      setShowSummary(true);
    },600000); // 10 minutes
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isLoaded]);

  /* ── Réinitialisation complète (sans reload) ────────── */
  const doReset = useCallback(() => {
    try { window.localStorage.removeItem(SAVE_KEY); } catch(e) {}
    const today = new Date().toLocaleDateString("fr-FR");
    const mood  = rMood();
    setTables(TABLES0);
    setServers(SERVERS0);
    setQueue([{id:1,name:rName(),size:Math.min(rSize(),2),mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p}]);
    setMenu(MENU0);
    setStock(STOCK0);
    setComplaints(COMPLAINTS0);
    setKitchen(KITCHEN0);
    setRestoXp(0);
    setCash(5000);
    setTransactions([{id:0,type:"revenu",label:"Capital de départ",amount:5000,date:Date.now()}]);
    setLoan(null);
    setSupplierMode("premium");
    setPendingDeliveries([]);
    const base=MENU0.filter(m=>m.cat!=="Boissons");
    const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
    setDailySpecials(picks.map(m=>({...m,originalPrice:m.price,price:+(m.price*0.8).toFixed(2),isSpecial:true})));
    setCompletedIds([]);
    setChallengeDate(today);
    setTodayChallenges(pickDailyChallenges(today));
    setChallengeProgress({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
    setChallengeClaimed({});
    setChallengeLostToday(false);
    setPendingClaim([]);
    setObjStats({totalServed:0,totalRevenue:0,perfectDays:0,tablesUpgraded:0,restoLevel:0});
    setDailyStats([{date:today,served:0,lost:0,revenue:0}]);
    setReputation(50);
    setWaitlist([]);
    setFormulas([]);
    setActiveTheme("none");
    setTab("tables");
    setShowResetModal(false);
  },[]);

  /* ── Chargement depuis localStorage ───────────────── */
  useEffect(()=>{
    loadGame().then(raw=>{
      if(raw){
        const sv=sanitizeSave(raw);
        if(sv.tables)    setTables(sv.tables);
        if(sv.servers)   setServers(sv.servers);
        if(sv.menu)      setMenu(sv.menu);
        if(sv.stock)     setStock(sv.stock);
        if(sv.complaints)setComplaints(sv.complaints);
        if(sv.kitchen)   setKitchen(sv.kitchen);
        if(sv.restoXp!=null) setRestoXp(sv.restoXp);
        if(sv.cash!=null)    setCash(sv.cash);
        if(sv.transactions)  setTransactions(sv.transactions);
        if(sv.loan!=null)    setLoan(sv.loan);
        if(sv.supplierMode)  setSupplierMode(sv.supplierMode);
        if(sv.pendingDeliveries) setPendingDeliveries(sv.pendingDeliveries);
        if(sv.dailySpecials) setDailySpecials(sv.dailySpecials);
        if(sv.completedIds)  setCompletedIds(sv.completedIds);
        if(sv.challengeDate) setChallengeDate(sv.challengeDate);
        if(sv.todayChallenges) setTodayChallenges(sv.todayChallenges);
        if(sv.challengeProgress) setChallengeProgress(sv.challengeProgress);
        if(sv.challengeClaimed)  setChallengeClaimed(sv.challengeClaimed);
        if(sv.challengeLostToday!=null) setChallengeLostToday(sv.challengeLostToday);
        if(sv.pendingClaim)  setPendingClaim(sv.pendingClaim);
        if(sv.objStats)      setObjStats(sv.objStats);
        if(sv.dailyStats)    setDailyStats(sv.dailyStats);
        if(sv.reputation!=null) setReputation(sv.reputation);
        if(sv.formulas)      setFormulas(sv.formulas);
        if(sv.activeTheme)   setActiveTheme(sv.activeTheme);
        setQueue(sv.queue||[]);
      }
      setIsLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const addDayStat=useCallback((key,value=1)=>{
    const today=new Date().toLocaleDateString("fr-FR");
    setDailyStats(p=>{
      const idx=p.findIndex(d=>d.date===today);
      if(idx>=0){
        const updated=[...p];
        updated[idx]={...updated[idx],[key]:+(updated[idx][key]+value).toFixed(2)};
        // Check perfect day when losing a client
        return updated;
      }
      const base={date:today,served:0,lost:0,revenue:0};
      return [...p,{...base,[key]:+value.toFixed(2)}].slice(-5);
    });
    if(key==="served") setObjStats(s=>({...s,totalServed:s.totalServed+1}));
    if(key==="rating") setObjStats(s=>({...s,totalRating:(s.totalRating||0)+value,ratingCount:(s.ratingCount||0)+1}));
    if(key==="revenue") setObjStats(s=>({...s,totalRevenue:+(s.totalRevenue+value).toFixed(2)}));
    if(key==="lost"){
      setObjStats(s=>({...s,_hadLoss:true}));
      setChallengeLostToday(true);
      setChallengeProgress(p=>({...p,noLoss:0}));
      updateReputation(REP_DELTA.lostClient,"client perdu");
    }
  },[]);
  const addTx=useCallback((type,label,amount)=>{
    setTransactions(p=>[{id:Date.now()+Math.random(),type,label,amount:+Math.abs(amount).toFixed(2),date:Date.now()},...p].slice(0,200));
  },[]);

  const [showHelp,setShowHelp]=useState(false);
  const dismissToast=useCallback(id=>setToasts(p=>p.filter(x=>x.id!==id)),[]);
  const addToast=useCallback(t=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p.slice(-4),{...t,id}]);
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);
  },[]);

  /* ── Réputation ────────────────────────────────────── */
  const repRef = useRef(50);
  useEffect(()=>{ repRef.current=reputation; },[reputation]);

  const updateReputation = useCallback((delta, reason="")=>{
    setReputation(prev=>{
      const before = getRepTier(prev);
      const next   = Math.min(100, Math.max(0, prev + delta));
      const after  = getRepTier(next);
      if(before.label !== after.label){
        const up = delta > 0;
        setTimeout(()=>addToast({
          icon: after.icon,
          title: up ? `Réputation en hausse !` : `Réputation en baisse !`,
          msg: `${after.label} (${Math.round(next)}/100)${reason?" · "+reason:""}`,
          color: after.color,
          tab: "stats",
        }),50);
      }
      repRef.current = next;
      return next;
    });
  },[addToast]);

  /* ── Sauvegarde automatique debounced (2s) ─────────── */
  useEffect(()=>{
    // Ne pas sauvegarder avant que la partie soit entièrement chargée
    if(!isLoaded) return;
    setSaveStatus("saving");
    if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current=setTimeout(()=>{
      saveGame({
        tables,servers,menu,stock,complaints,kitchen,
        restoXp,cash,transactions,loan,supplierMode,
        pendingDeliveries,dailySpecials,completedIds,
        challengeDate,todayChallenges,challengeProgress,
        challengeClaimed,challengeLostToday,pendingClaim,
        objStats,dailyStats,reputation,formulas,activeTheme,
      });
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus("idle"),2000);
    },2000);
    return()=>{if(saveTimerRef.current)clearTimeout(saveTimerRef.current);};
  },[isLoaded,tables,servers,menu,stock,complaints,kitchen,
     restoXp,cash,loan,supplierMode,pendingDeliveries,
     completedIds,challengeProgress,challengeClaimed,
     challengeLostToday,pendingClaim,objStats,dailyStats,reputation]);

  /* ── GDevelop : écoute du message d'initialisation ─── */
  useEffect(()=>{
    const handler = (event) => {
      // Accepter uniquement les messages venant de GDevelop
      if (!event.data || event.data.source !== "gdevelop") return;
      const { type, payload } = event.data;

      if (type === "INIT" && payload) {
        // Charger les données envoyées par GDevelop en priorité sur localStorage
        if (payload.argent        != null) setCash(payload.argent);
        if (payload.restoXp       != null) setRestoXp(payload.restoXp);
        if (payload.stock)                 setStock(payload.stock);
        if (payload.servers)               setServers(payload.servers);
        if (payload.tables)                setTables(payload.tables);
        if (payload.kitchen)               setKitchen(payload.kitchen);
        if (payload.objStats)              setObjStats(payload.objStats);
        if (payload.dailyStats)            setDailyStats(payload.dailyStats);
        if (payload.completedIds)          setCompletedIds(payload.completedIds);
        if (payload.challengeProgress)     setChallengeProgress(payload.challengeProgress);
        if (payload.loan         != null)  setLoan(payload.loan);
        console.info("[GDevelop Bridge] Init reçu ✓", payload);
        // Confirmer la réception à GDevelop
        sendToGDevelop({ type: "INIT_ACK", ok: true });
      }

      if (type === "PING") {
        sendToGDevelop({ type: "PONG", ready: isLoaded });
      }
    };
    window.addEventListener("message", handler);
    // Signaler à GDevelop que l'iframe est prête
    sendToGDevelop({ type: "READY" });
    return () => window.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── GDevelop : sync debounced (1s) sur les états clés ── */
  const gdSyncTimerRef = useRef(null);
  useEffect(()=>{
    if (!isLoaded) return;
    if (gdSyncTimerRef.current) clearTimeout(gdSyncTimerRef.current);
    gdSyncTimerRef.current = setTimeout(()=>{
      const payload = buildGDevelopPayload({ cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats });
      sendToGDevelop({ type: "SYNC", ...payload });
    }, 1000);
    return () => { if (gdSyncTimerRef.current) clearTimeout(gdSyncTimerRef.current); };
  },[isLoaded, cash, restoXp, stock, queue, tables, kitchen, objStats, servers, dailyStats]);

  // Salary — deducted every hour (real time). Only active staff.
  useEffect(()=>{
    const iv=setInterval(()=>{
      let total=0;
      const lines=[];
      setServers(sv=>{
        sv.filter(s=>s.status==="actif").forEach(s=>{
          total+=s.salary||0;
          lines.push(`${s.name.split(" ")[0]} ${(s.salary||0).toFixed(0)}€`);
        });
        return sv;
      });
      setKitchen(k=>{
        const chefWage=k.chef.salary||0;
        total+=chefWage;
        lines.push(`${k.chef.name.split(" ")[0]} ${chefWage.toFixed(0)}€`);
        const cl2=chefLv(k.chef.totalXp);
        const unlocked=CHEF_LVL[Math.min(cl2.l,CHEF_LVL.length-1)].commis;
        k.commis.slice(0,unlocked).filter(c=>c.status==="actif").forEach(c=>{
          total+=c.salary||0;
          lines.push(`${c.name.split(" ")[0]} ${(c.salary||0).toFixed(0)}€`);
        });
        return k;
      });
      if(total>0){
        setCash(c=>+Math.max(0,c-total).toFixed(2));
        addTx("salaire",`Salaires (${lines.join(", ")})`,total);
        addToast({icon:"💸",title:`Salaires — ${total.toFixed(0)} €`,
          msg:lines.join(" · "),color:C.navy,tab:"stats"});
      }
      // Loan repayment each hour
      setLoan(ln=>{
        if(!ln)return ln;
        const repay=Math.min(ln.remaining,ln.repayPerHour);
        const newRemaining=+(ln.remaining-repay).toFixed(2);
        setCash(c=>+Math.max(0,c-repay).toFixed(2));
        addTx("remboursement",`Remboursement prêt (${ln.id}) — mensualité`,repay);
        if(newRemaining<=0){
          addToast({icon:"🎉",title:"Prêt remboursé !",msg:"Votre emprunt est soldé.",color:C.green,tab:"stats"});
          return null;
        }
        return{...ln,remaining:newRemaining};
      });
    },3600000);
    return()=>clearInterval(iv);
  },[addToast]);

  // Moral drain/gain — every 5 min real time
  useEffect(()=>{
    const iv=setInterval(()=>{
      setServers(prev=>prev.map(s=>{
        if(s.status==="actif"||s.status==="service"){
          // Drain en travaillant
          const newMoral=Math.max(0,(s.moral??100)-1);
          // Alerte burnout
          if(newMoral===10){
            setTimeout(()=>addToast({icon:"😓",title:`${s.name} épuisé·e !`,
              msg:"Moral critique — mettez-le/la en pause ou offrez une prime.",
              color:C.red,tab:"servers"}),50);
          }
          return {...s,moral:newMoral};
        }
        if(s.status==="pause"){
          return {...s,moral:Math.min(100,(s.moral??100)+MORAL_PAUSE_GAIN)};
        }
        return s;
      }));
    },MORAL_DRAIN_INTERVAL);
    return()=>clearInterval(iv);
  },[addToast]);

  // Specialty unlock — check on every XP gain (level 2 & 4)
  useEffect(()=>{
    setServers(prev=>prev.map(s=>{
      const sl=srvLv(s.totalXp);
      // Unlock specialty at level 2 if not already set
      if(sl.l>=2&&!s.specialty){
        const sp=pickSpecialty();
        setTimeout(()=>addToast({icon:sp.icon,
          title:`${s.name} — Spécialité débloquée !`,
          msg:`${sp.name} : ${sp.desc}`,color:sp.color,tab:"servers"}),100);
        return {...s,specialty:sp};
      }
      // Upgrade specialty at level 4 (mark as upgraded)
      if(sl.l>=4&&s.specialty&&!s.specialtyUpgraded){
        setTimeout(()=>addToast({icon:"⬆️",
          title:`${s.name} — Spécialité améliorée !`,
          msg:`${s.specialty.name} niveau 2`,color:s.specialty.color,tab:"servers"}),100);
        return {...s,specialtyUpgraded:true};
      }
      return s;
    }));
  },[servers.map(s=>srvLv(s.totalXp).l).join(",")]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      const now=Date.now();
      setPendingDeliveries(prev=>{
        const arrived=prev.filter(d=>now>=d.arrivedAt);
        if(!arrived.length)return prev;
        arrived.forEach(d=>{
          setStock(s=>s.map(item=>{
            const match=d.items.find(x=>x.stockId===item.id);
            return match?{...item,qty:+(item.qty+match.qty).toFixed(3)}:item;
          }));
          addToast({icon:"🚚",title:"Livraison arrivée !",
            msg:d.labels,color:C.green,tab:"stock"});
        });
        return prev.filter(d=>now<d.arrivedAt);
      });
    },5000);
    return()=>clearInterval(iv);
  },[addToast]);

  // Random events — fire every 4 minutes (real time), 60% chance
  const stockRef=useRef(stock);
  const cashRef=useRef(cash);
  const complaintsRef=useRef(complaints);
  useEffect(()=>{stockRef.current=stock;},[stock]);
  useEffect(()=>{cashRef.current=cash;},[cash]);
  useEffect(()=>{complaintsRef.current=complaints;},[complaints]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      if(Math.random()<0.60){
        const evt=GAME_EVENTS[Math.floor(Math.random()*GAME_EVENTS.length)];
        setActiveEvent(evt.id);
        setTimeout(()=>setActiveEvent(null),8000);
        evt.apply(
          stockRef.current,cashRef.current,complaintsRef.current,
          addToast,setCash,addTx,setComplaints,
          setQueue,rMood,rName,rSize,tablesRef.current,setStock,updateReputation
        );
      }
    },240000);
    return()=>clearInterval(iv);
  },[addToast,addTx]);

  // Daily specials rotate every real hour
  useEffect(()=>{
    const iv=setInterval(()=>{
      setMenu(m=>{
        const base=m.filter(x=>x.cat!=="Boissons");
        const picks=base.sort(()=>Math.random()-0.5).slice(0,2);
        const ids=new Set(picks.map(p=>p.id));
        const specials=picks.map(p=>({...p,originalPrice:p.price,price:+(p.price*0.8).toFixed(2),isSpecial:true}));
        setDailySpecials(specials);
        return m.map(x=>ids.has(x.id)?{...x,isSpecial:true}:({...x,isSpecial:false}));
      });
    },3600000);
    return()=>clearInterval(iv);
  },[]);

  // Spawn clients — polling toutes les 500ms, spawn garanti toutes les 30s
  // On stocke le timestamp du dernier spawn dans un ref (jamais remis à zéro par les re-renders)
  const tablesRef=useRef(tables);
  const lastSpawnRef=useRef(Date.now());
  useEffect(()=>{tablesRef.current=tables;},[tables]);
  useEffect(()=>{
    const iv=setInterval(()=>{
      const now=Date.now();
      const tier = getRepTier(repRef.current);
      const interval = Math.round(30000 / (tier.spawnMult || 1));
      if(now-lastSpawnRef.current>=interval){
        lastSpawnRef.current=now;
        const mood=rMood();
        const maxCap=Math.max(...tablesRef.current.filter(t=>t.status==="libre").map(t=>t.capacity),2);
        const size=Math.min(rSize(),maxCap);
        setQueue(q=>[...q,{
          id:Date.now()+Math.random(),name:rName(),size,
          mood,expiresAt:Date.now()+mood.p*1000,patMax:mood.p,
        }]);
      }
    },500);
    return()=>clearInterval(iv);
  },[]);

  // FullHouse challenge: check if 5+ tables are occupied simultaneously (every 2s)
  useEffect(()=>{
    const iv=setInterval(()=>{
      setTables(prev=>{
        const occ=prev.filter(t=>t.status==="occupée"||t.status==="mange").length;
        if(occ>=5) setChallengeProgress(p=>p.fullHouse>=1?p:{...p,fullHouse:1});
        return prev;
      });
      // Rotate challenges if date changed
      const today=new Date().toLocaleDateString("fr-FR");
      setChallengeDate(prev=>{
        if(prev!==today){
          setTodayChallenges(pickDailyChallenges(today));
          setChallengeProgress({served:0,revenue:0,noLoss:1,highRating:0,fastPlace:0,vip:0,fullHouse:0,tips:0});
          setChallengeLostToday(false);
          setChallengeClaimed({});
        }
        return today;
      });
    },2000);
    return()=>clearInterval(iv);
  },[]);

  // Expiry check — runs every 500ms
  useEffect(()=>{
    const iv=setInterval(()=>{
      const t=Date.now();
      let expired=[];
      setQueue(q=>{
        expired=q.filter(c=>t>=c.expiresAt);
        return expired.length>0?q.filter(c=>t<c.expiresAt):q;
      });
      // Groupes expirés → liste d'attente rappelable 2 minutes
      if(expired.length>0){
        setWaitlist(w=>[
          ...w,
          ...expired.map(c=>({...c,leftAt:t,recallUntil:t+120000}))
        ]);
        expired.forEach(c=>{
          addToast({
            icon:"😤",title:"Groupe parti !",
            msg:`${c.name} n'a plus patience — rappelable 2 min`,
            color:C.terra,tab:"tables"
          });
        });
      }
      // Waitlist : groupes non rappelés → perdus définitivement
      let reallyLost=[];
      setWaitlist(w=>{
        reallyLost=w.filter(c=>t>=c.recallUntil);
        return reallyLost.length>0?w.filter(c=>t<c.recallUntil):w;
      });
      reallyLost.forEach(()=>addDayStat("lost"));
      // Cleaning completion
      setTables(prev=>{
        const done=prev.filter(tb=>tb.status==="nettoyage"&&tb.cleanUntil&&t>=tb.cleanUntil);
        if(!done.length)return prev;
        done.forEach(tb=>addToast({icon:"✨",title:"Table prête",msg:`${tb.name} est de nouveau disponible.`,color:C.green,tab:"tables"}));
        return prev.map(tb=>done.find(d=>d.id===tb.id)
          ?{...tb,status:"libre",server:null,cleanUntil:null,cleanDur:null,freedAt:t}
          :tb);
      });
      // Release cleaners when done
      setServers(prev=>{
        const t2=Date.now();
        return prev.map(s=>s.status==="service"&&s.serviceUntil&&t2>=s.serviceUntil
          ?{...s,status:"actif",serviceUntil:null}:s);
      });
    },500);
    return()=>clearInterval(iv);
  },[addToast,addDayStat]);

  const sAlerts=stock.filter(s=>s.qty<=s.alert).length;
  const [seenIds,setSeenIds]=useState(new Set());
  const nCompl=complaints.filter(c=>c.status==="nouveau"&&!seenIds.has(c.id)).length;
  const [clockNow,setClockNow]=useState(Date.now());
  useEffect(()=>{const iv=setInterval(()=>setClockNow(Date.now()),250);return()=>clearInterval(iv);},[]);
  const now=new Date(clockNow);

  const rl=restoLv(restoXp);
  const rlD=rl.d;
  const activeTables=tables.slice(0,rlD.tables);

  const addRestoXp=useCallback((xp)=>{
    setRestoXp(prev=>{
      const before=restoLv(prev);
      const after=restoLv(prev+xp);
      if(after.l>before.l){
        const nd=RESTO_LVL[after.l];
        setTimeout(()=>addToast({
          icon:nd.icon,
          title:`Niveau ${nd.l} — ${nd.name} !`,
          msg:`🎉 ${nd.tables} tables débloquées`,
          color:nd.color,
          tab:"tables",
        }),50);
        setObjStats(s=>({...s,restoLevel:after.l}));
      }
      return prev+xp;
    });
  },[addToast]);

  // Check objectives whenever objStats changes
  useEffect(()=>{
    const newPending=OBJECTIVES_DEF
      .filter(o=>!completedIds.includes(o.id)&&!pendingClaim.includes(o.id)&&o.condition(objStats))
      .map(o=>o.id);
    if(newPending.length>0){
      setPendingClaim(p=>[...p,...newPending]);
      newPending.forEach(id=>{
        const obj=OBJECTIVES_DEF.find(o=>o.id===id);
        if(obj)addToast({icon:"🎯",title:"Objectif atteint !",msg:obj.title,color:C.amber,tab:"objectives"});
      });
    }
  },[objStats]);

  const claimObjective=useCallback((id)=>{
    const obj=OBJECTIVES_DEF.find(o=>o.id===id);
    if(!obj)return;
    setCompletedIds(p=>[...p,id]);
    setPendingClaim(p=>p.filter(x=>x!==id));
    setCash(c=>+(c+obj.reward.cash).toFixed(2));
    addTx("revenu",`Récompense objectif : ${obj.title}`,obj.reward.cash);
    addRestoXp(obj.reward.xp);
    addToast({icon:obj.icon,title:`+${obj.reward.cash}€ · +${obj.reward.xp} XP`,
      msg:`Objectif "${obj.title}" réclamé !`,color:C.green,tab:"objectives"});
  },[addTx,addRestoXp,addToast]);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.ink,fontFamily:F.body}}>
      {/* Écran de chargement */}
      {!isLoaded&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:99999,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{width:52,height:52,background:C.green,borderRadius:14,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
            animation:"pulse 1s ease-in-out infinite"}}>🍽</div>
          <div style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>Chargement de la partie…</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Récupération de la sauvegarde</div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; }
        .hovcard:hover { box-shadow: 0 6px 22px rgba(0,0,0,0.11) !important; transform: translateY(-1px); }
        .hovbtn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .hovbtn { transition: filter 0.15s, transform 0.15s; }
        select option { background:#fff; color:#1a1612; }
        ::placeholder { color:#b0a490; }
        input:focus, select:focus { outline: 2px solid #2a5c3f88 !important; border-color: #2a5c3f !important; }
        @keyframes slideIn  { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes popIn    { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        @keyframes breathe  { 0%,100%{box-shadow:0 0 0 0 rgba(42,92,63,0)} 50%{box-shadow:0 0 0 6px rgba(42,92,63,0.18)} }
        @keyframes breatheAmber { 0%,100%{box-shadow:0 0 0 0 rgba(184,125,16,0)} 50%{box-shadow:0 0 0 5px rgba(184,125,16,0.22)} }
        @keyframes toastBar { from{width:100%} to{width:0%} }
        @keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes saveFlash{ 0%{opacity:0;transform:scale(0.8)} 20%{opacity:1;transform:scale(1.1)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.95)} }
        /* ── Mobile ── */
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
          .content-area { padding: 14px 12px 90px !important; }
          .badge-alert { font-size: 8px !important; width: 14px !important; height: 14px !important; }
        }
        @media (min-width: 641px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
          .content-area { padding: 20px 22px !important; }
        }
      `}</style>

      {/* Header — 2 lignes */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
        boxShadow:"0 1px 8px rgba(0,0,0,0.07)"}}>

        {/* Ligne 1 : logo · alertes · horloge · aide */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"0 12px",minHeight:48,gap:8,flexWrap:"nowrap",overflow:"hidden"}}>

          {/* Logo + nom */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,minWidth:0}}>
            <div style={{width:32,height:32,background:C.green,borderRadius:8,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🍽</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Le Grand Restaurant</div>
              <div style={{fontSize:9,color:C.muted,textTransform:"capitalize",whiteSpace:"nowrap"}}>
                {now.toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
              </div>
            </div>
          </div>

          {/* Alertes + horloge + aide */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {sAlerts>0&&(
              <div style={{background:C.redP,border:`1px solid ${C.red}33`,borderRadius:6,
                padding:"3px 7px",fontSize:10,color:C.red,fontWeight:600,whiteSpace:"nowrap"}}>
                ⚠{sAlerts}
              </div>
            )}
            {nCompl>0&&tab!=="complaints"&&(
              <div onClick={()=>{
                setTab("complaints");
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
              }} style={{background:C.terraP,border:`1px solid ${C.terra}33`,borderRadius:6,
                padding:"3px 7px",fontSize:10,color:C.terra,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                💬{nCompl}
              </div>
            )}
            {queue.length>=5&&(
              <div style={{background:C.redP,border:`1px solid ${C.red}33`,borderRadius:6,
                padding:"3px 7px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",
                animation:"pulse 1.2s ease-in-out infinite"}}>
                🚨 Salle saturée
              </div>
            )}
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title,lineHeight:1.1}}>
                {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
              </div>
              <div style={{fontSize:9,color:C.muted,whiteSpace:"nowrap"}}>
                {activeTables.filter(t=>t.status==="occupée"||t.status==="mange").length}/{activeTables.length} tables
              </div>
            </div>
            <button onClick={()=>setShowHelp(true)} title="Guide utilisateur" style={{
              width:28,height:28,borderRadius:"50%",
              border:`1.5px solid ${C.green}`,
              background:C.greenP,cursor:"pointer",fontSize:13,
              color:C.green,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800}}>
              ?
            </button>

            {/* Bouton reset */}
            <button onClick={()=>setShowResetModal(true)} title="Nouvelle partie" style={{
              width:28,height:28,borderRadius:"50%",
              border:`1.5px solid ${C.red}44`,
              background:C.redP,cursor:"pointer",fontSize:13,
              color:C.red,display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,fontWeight:800,opacity:0.7}}>
              ↺
            </button>
          </div>
        </div>

        {/* Ligne 2 : niveau restaurant + cash */}
        <div style={{borderTop:`1px solid ${C.border}`,
          padding:"6px 12px 8px",display:"flex",alignItems:"center",gap:10,
          background:C.bg,flexWrap:"nowrap",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:14}}>{rlD.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:rlD.color,fontFamily:F.title,whiteSpace:"nowrap"}}>{rlD.name}</span>
            <span style={{fontSize:9,background:rlD.color+"18",color:rlD.color,
              border:`1px solid ${rlD.color}33`,borderRadius:4,
              padding:"1px 5px",fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>N{rlD.l}</span>
          </div>
          <div style={{flex:1,minWidth:40}}>
            <div style={{height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",
                width:rl.l>=RESTO_LVL.length-1?"100%":`${rl.pct}%`,
                background:rlD.color,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>
          </div>
          <div style={{fontSize:9,color:C.muted,fontFamily:F.body,flexShrink:0,whiteSpace:"nowrap"}}>
            {rl.l>=RESTO_LVL.length-1
              ? "✦ Max"
              : `${restoXp}/${rl.next.xpNeeded} XP`
            }
          </div>

          {/* ── Réputation ── */}
          {(()=>{
            const tier=getRepTier(reputation);
            return(
              <div title={`${tier.label} — ${tier.desc}`}
                style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,
                  background:tier.color+"14",border:`1px solid ${tier.color}33`,
                  borderRadius:7,padding:"3px 8px",cursor:"default"}}>
                <span style={{fontSize:13}}>{tier.icon}</span>
                <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:50}}>
                  <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",
                      width:`${reputation}%`,
                      background:tier.color,
                      borderRadius:99,transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:8,color:tier.color,fontWeight:700,
                    fontFamily:F.body,whiteSpace:"nowrap",lineHeight:1}}>
                    {tier.icon} {Math.round(reputation)}/100
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cash */}
          <div onClick={()=>setShowLedger(true)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,
            background:cash<200?C.redP:C.greenP,
            border:`1px solid ${cash<200?C.red:C.green}33`,
            borderRadius:7,padding:"3px 10px",cursor:"pointer"}}
            title="Voir le grand livre">
            <span style={{fontSize:12}}>💰</span>
            <span style={{fontSize:12,fontWeight:700,
              color:cash<200?C.red:C.green,fontFamily:F.title,whiteSpace:"nowrap"}}>
              {cash.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} €
            </span>
            <span style={{fontSize:9,color:cash<200?C.red:C.green,opacity:0.7}}>▼</span>
          </div>
          {/* Loan indicator + bank button */}
          <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            {loan&&(
              <div style={{background:C.amberP,border:`1px solid ${C.amber}44`,borderRadius:6,
                padding:"3px 8px",fontSize:10,color:C.amber,fontWeight:600,whiteSpace:"nowrap"}}>
                🏦 −{loan.remaining.toFixed(0)}€
              </div>
            )}
            <button onClick={()=>setShowBank(true)} title="Banque" style={{
              padding:"4px 10px",fontSize:11,fontWeight:600,
              background:loan?C.amberP:C.navyP,
              border:`1.5px solid ${loan?C.amber:C.navy}44`,
              borderRadius:7,color:loan?C.amber:C.navy,cursor:"pointer",
              fontFamily:F.body,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              🏦
            </button>
          </div>

          {/* Bouton sauvegarde manuelle */}
          <button
            onClick={()=>{
              if(saveStatus==="saving") return;
              setSaveStatus("saving");
              if(saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveGame({
                tables,servers,menu,stock,complaints,kitchen,
                restoXp,cash,transactions,loan,supplierMode,
                pendingDeliveries,dailySpecials,completedIds,
                challengeDate,todayChallenges,challengeProgress,
                challengeClaimed,challengeLostToday,pendingClaim,
                objStats,dailyStats,reputation,
              });
              setSaveStatus("saved");
              setTimeout(()=>setSaveStatus("idle"),2000);
            }}
            title="Sauvegarder maintenant"
            style={{
              flexShrink:0,display:"flex",alignItems:"center",gap:5,
              padding:"5px 12px",borderRadius:7,
              background:saveStatus==="saved"?C.green:saveStatus==="saving"?C.amber:C.navy,
              border:"none",cursor:saveStatus==="saving"?"not-allowed":"pointer",
              transition:"background 0.3s",fontFamily:F.body}}>
            <span style={{fontSize:13,
              animation:saveStatus==="saving"?"pulse 0.8s ease-in-out infinite":undefined}}>
              {saveStatus==="saved"?"✅":saveStatus==="saving"?"⏳":"💾"}
            </span>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>
              {saveStatus==="saved"?"Sauvé !":saveStatus==="saving"?"…":"Sauvegarder"}
            </span>
          </button>
        </div>
      </div>

      {/* Nav Desktop (C) */}
      <div className="desktop-nav" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
        padding:"0 20px",overflowX:"auto"}}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(challengeLostToday?0:1):
              ch.key==="fullHouse"||ch.key==="vip"?(challengeProgress[ch.key]||0):
              (challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} style={{
              background:active?C.greenP:"transparent",color:active?C.green:C.muted,
              border:"none",borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              borderRadius:active?"10px 10px 0 0":0,
              padding:"13px 17px",fontSize:13,fontWeight:active?600:400,
              cursor:"pointer",fontFamily:F.body,
              display:"flex",alignItems:"center",gap:7,
              transition:"color 0.15s",whiteSpace:"nowrap"}}>
              <span style={{fontSize:15}}>{t.icon}</span>
              <span style={{fontSize:12}}>{t.label}</span>
              {badge>0&&(
                <span className="badge-alert" style={{background:C.red,color:"#fff",borderRadius:"50%",
                  width:17,height:17,fontSize:9,fontWeight:700,
                  display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="content-area" style={{maxWidth:1300,margin:"0 auto"}}>
        {tab==="tables"     &&<TablesView     tables={activeTables} setTables={setTables}   servers={servers} setServers={setServers} menu={menu} setMenu={setMenu} setKitchen={setKitchen} kitchen={kitchen} addToast={addToast} addRestoXp={addRestoXp} cash={cash} setCash={setCash} addTx={addTx} queue={queue} setQueue={setQueue} waitlist={waitlist} setWaitlist={setWaitlist} addDayStat={addDayStat} clockNow={clockNow} onTableUpgrade={()=>setObjStats(s=>({...s,tablesUpgraded:s.tablesUpgraded+1}))} setComplaints={setComplaints} dailySpecials={dailySpecials} activeEvent={activeEvent} setChallengeProgress={setChallengeProgress} reputation={reputation} updateReputation={updateReputation}/>}
        {tab==="servers"    &&<ServersView    servers={servers} setServers={setServers} tables={activeTables} clockNow={clockNow} restoLvN={rl.l} cash={cash} setCash={setCash} addTx={addTx} addToast={addToast}/>}
        {tab==="cuisine"    &&<KitchenView    kitchen={kitchen}     setKitchen={setKitchen}  stock={stock} setStock={setStock} tables={activeTables} setTables={setTables} addToast={addToast} cash={cash} setCash={setCash} addTx={addTx}/>}
        {tab==="menu"       &&<MenuView       menu={menu} setMenu={setMenu} stock={stock} formulas={formulas} setFormulas={setFormulas} activeTheme={activeTheme} setActiveTheme={setActiveTheme} dailyStats={dailyStats}/>}
        {tab==="stock"      &&<StockView      stock={stock} setStock={setStock} cash={cash} setCash={setCash} addTx={addTx} kitchen={kitchen} supplierMode={supplierMode} setSupplierMode={setSupplierMode} pendingDeliveries={pendingDeliveries} setPendingDeliveries={setPendingDeliveries}/>}
        {tab==="objectives" &&<ObjectivesView objStats={objStats} completedIds={completedIds} onClaim={claimObjective} pendingClaim={pendingClaim} todayChallenges={todayChallenges} challengeProgress={challengeProgress} challengeClaimed={challengeClaimed} setChallengeClaimed={setChallengeClaimed} challengeLostToday={challengeLostToday} setCash={setCash} addTx={addTx} addRestoXp={addRestoXp} addToast={addToast} restoXp={restoXp} restoLvN={rl.l}/>}
        {tab==="complaints" &&<ComplaintsView complaints={complaints} setComplaints={setComplaints} tables={activeTables} servers={servers} seenIds={seenIds}/>}
        {tab==="stats"      &&<StatsView dailyStats={dailyStats} loan={loan} objStats={objStats} restoXp={restoXp} kitchen={kitchen} servers={servers} reputation={reputation}/>}
      </div>

      {/* Nav Mobile fixe en bas (C) */}
      <div className="mobile-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:900,
        background:C.surface,borderTop:`1px solid ${C.border}`,
        boxShadow:"0 -4px 20px rgba(0,0,0,0.1)",
        justifyContent:"space-around",alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom,8px)"}}>
        {TABS.map(t=>{
          const readyChallenges=(todayChallenges||[]).filter(ch=>{
            const val=ch.key==="noLoss"?(challengeLostToday?0:1):(challengeProgress[ch.key]||0);
            return val>=ch.target&&!(challengeClaimed||{})[ch.id];
          }).length;
          const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:0;
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>{
              setTab(t.id);
              if(t.id==="complaints")
                setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
            }} style={{
              flex:1,background:"transparent",border:"none",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",padding:"8px 2px 6px",
              cursor:"pointer",position:"relative",
              borderTop:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
              gap:3}}>
              <span style={{fontSize:20,lineHeight:1,filter:active?"none":"grayscale(0.4) opacity(0.6)"}}>{t.icon}</span>
              <span style={{fontSize:8,fontWeight:active?700:400,fontFamily:F.body,
                color:active?C.green:C.muted,whiteSpace:"nowrap",letterSpacing:"0.02em"}}>
                {t.label}
              </span>
              {badge>0&&(
                <span style={{position:"absolute",top:4,right:"calc(50% - 14px)",
                  background:C.red,color:"#fff",borderRadius:"50%",
                  width:14,height:14,fontSize:8,fontWeight:700,
                  display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showHelp&&<HelpModal onClose={()=>setShowHelp(false)}/>}
      {showBank&&<BankModal onClose={()=>setShowBank(false)} cash={cash} loan={loan}
        setLoan={setLoan} setCash={setCash} addTx={addTx} addToast={addToast}/>}
      {/* Ledger modal */}
      {showLedger&&(
        <div onClick={()=>setShowLedger(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.45)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            width:"100%",maxWidth:560,maxHeight:"80vh",display:"flex",flexDirection:"column",
            boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:C.ink,fontFamily:F.title}}>💰 Grand livre</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                  Solde actuel : <span style={{fontWeight:700,color:cash<200?C.red:C.green}}>
                    {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                  </span>
                </div>
              </div>
              <button onClick={()=>setShowLedger(false)} style={{
                background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted}}>✕</button>
            </div>
            {/* Summary row */}
            {(()=>{
              const totalIn=transactions.filter(t=>t.type==="revenu").reduce((s,t)=>s+t.amount,0);
              const totalOut=transactions.filter(t=>t.type!=="revenu").reduce((s,t)=>s+t.amount,0);
              return(
                <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {[
                    {label:"Recettes",val:totalIn,c:C.green,bg:C.greenP,icon:"📈"},
                    {label:"Dépenses",val:totalOut,c:C.red,bg:C.redP,icon:"📉"},
                    {label:"Résultat",val:totalIn-totalOut,c:totalIn-totalOut>=0?C.green:C.red,bg:totalIn-totalOut>=0?C.greenP:C.redP,icon:"⚖️"},
                  ].map(s=>(
                    <div key={s.label} style={{flex:1,background:s.bg,padding:"10px 14px",textAlign:"center",
                      borderRight:`1px solid ${C.border}`}}>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:2}}>{s.icon} {s.label}</div>
                      <div style={{fontSize:14,fontWeight:700,color:s.c,fontFamily:F.title}}>
                        {s.val>=0?"+":""}{s.val.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Transaction list */}
            <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
              {transactions.length===0?(
                <div style={{padding:24,textAlign:"center",color:C.muted,fontFamily:F.body,fontSize:13}}>
                  Aucune transaction
                </div>
              ):transactions.map(tx=>{
                const isIn=tx.type==="revenu";
                const typeColors={revenu:C.green,achat:C.terra,salaire:C.navy};
                const typeIcons={revenu:"💶",achat:"🛒",salaire:"💸"};
                const c=typeColors[tx.type]||C.muted;
                const d=new Date(tx.date);
                const hm=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
                return(
                  <div key={tx.id} style={{display:"flex",alignItems:"flex-start",gap:12,
                    padding:"10px 22px",borderBottom:`1px solid ${C.border}11`}}>
                    <div style={{width:32,height:32,background:c+"18",border:`1px solid ${c}33`,
                      borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:15,flexShrink:0}}>
                      {typeIcons[tx.type]||"💰"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {tx.label}
                      </div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                        {hm} · {tx.type}
                      </div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:isIn?C.green:C.red,
                      fontFamily:F.title,flexShrink:0}}>
                      {isIn?"+":"-"}{tx.amount.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modale confirmation reset */}
      {showResetModal&&(
        <div onClick={()=>setShowResetModal(false)} style={{position:"fixed",inset:0,
          background:"rgba(0,0,0,0.55)",zIndex:10001,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,
            padding:28,width:"100%",maxWidth:380,
            boxShadow:"0 24px 60px rgba(0,0,0,0.3)",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:8}}>
              Nouvelle partie ?
            </div>
            <div style={{fontSize:13,color:C.muted,fontFamily:F.body,marginBottom:24,lineHeight:1.6}}>
              Toute la progression sera effacée.<br/>
              Cette action est <strong>irréversible</strong>.
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setShowResetModal(false)} style={{
                padding:"10px 22px",borderRadius:9,border:`1.5px solid ${C.border}`,
                background:C.bg,color:C.muted,cursor:"pointer",
                fontSize:13,fontWeight:600,fontFamily:F.body}}>
                Annuler
              </button>
              <button onClick={doReset} style={{
                padding:"10px 22px",borderRadius:9,border:"none",
                background:C.red,color:"#fff",cursor:"pointer",
                fontSize:13,fontWeight:700,fontFamily:F.body,
                boxShadow:`0 4px 14px ${C.red}55`}}>
                🗑 Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary&&(
        <DailySummaryModal
          onClose={()=>setShowSummary(false)}
          dailyStats={dailyStats}
          objStats={objStats}
          servers={servers}
          menu={menu}
          transactions={transactions}
          isRecord={summaryIsRecord}/>
      )}

      <Toasts list={toasts} onDismiss={dismissToast} onNavigate={setTab}/>
    </div>
  );
}
