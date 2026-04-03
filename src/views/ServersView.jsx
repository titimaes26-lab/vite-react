/* ═══════════════════════════════════════════════════════
   src/views/ServersView.jsx
   Extrait du monolithe restaurant-manager.jsx
   Dépendances déclarées dans les imports ci-dessous.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F, SRV_LVL, RESTO_LVL, SERVER_SLOTS_BY_LEVEL } from "../constants/gameData.js";
import { Badge, Card, Btn, Modal, Lbl, Inp, Sel, XpBar } from "../components/ui/index.js";
import { srvLv } from "../utils/levelUtils.js";
import { rName } from "../utils/randomUtils.js";
/* ─── Helpers locaux ────────────────────────────────── */
const moralIcon   = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralLabel  = (m) => m>=70?"En forme":m>=40?"Fatigué":m>=20?"Épuisé":"Burnout";

/* ─── Helpers & données locaux ──────────────────────── */
const moralColor  = (m) => m>=70 ? "#236b47" : m>=40 ? "#a86e08" : "#b83025";

const SRV_SPECIALTIES = [
  { id:"speed",    icon:"⚡", name:"Rapidité",     color:"#1c3352", desc:"−30% temps de prise de commande",  tipMult:1.0,  speedMult:0.70 },
  { id:"charm",    icon:"✨", name:"Charme",        color:"#6b3fa0", desc:"Pourboires +20%",                  tipMult:1.20, speedMult:1.0  },
  { id:"sommelier",icon:"🍷", name:"Sommelier",     color:"#c4622d", desc:"Boissons commandées +30%",         tipMult:1.10, speedMult:1.0  },
  { id:"vip",      icon:"🎩", name:"Gestion VIP",   color:"#b87d10", desc:"Patience clients VIP +30s",        tipMult:1.15, speedMult:1.0  },
];;

const pickSpecialty = () => SRV_SPECIALTIES[Math.floor(Math.random()*SRV_SPECIALTIES.length)];

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
];;

const getMaxMoral = (sv) => {
  const bienetre = (sv.trainings||{})["bienetre"] || 0;
  return 100 + (bienetre>=1?10:0) + (bienetre>=2?10:0);
};;




export function ServersView({servers,setServers,tables,clockNow,restoLvN,cash,setCash,addTx,addToast,candidatePool=[],setCandidatePool,candidateDate="",setCandidateDate,bp={}}){
  const [modal,setModal]=useState(false);   // "hire" | "edit" | "fire" | "train" | false
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


  // Générer un pool de 9 candidats reproductibles par date
  const generatePool = (dateStr) => {
    let seed = dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0), 0);
    const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const names1=["Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo","Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"];
    const names2=["Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"];
    return Array.from({length:9}, (_,i) => {
      const salary  = Math.round(rng()*8+10);
      const xp      = Math.round(rng()*180);
      const moral   = Math.round(rng()*30+70);
      const hasSpec = rng() > 0.5;
      const specIdx = Math.floor(rng()*SRV_SPECIALTIES.length);
      const name    = names1[Math.floor(rng()*names1.length)]+" "+names2[Math.floor(rng()*names2.length)];
      return {
        id      : `${dateStr}-${i}`,
        name,
        salary,
        totalXp : xp,
        moral,
        rating  : +(3.5 + rng()*1.5).toFixed(1),
        specialty: hasSpec && xp >= 80 ? SRV_SPECIALTIES[specIdx] : null,
        hireCost: salary * 3,
      };
    });
  };

  const openHire = () => {
    const today = new Date().toLocaleDateString("fr-FR");
    if(candidateDate !== today || candidatePool.length === 0) {
      setCandidatePool(generatePool(today));
      setCandidateDate(today);
    }
    setModal("hire");
  };

  const hireCandidate = (candidate) => {
    if(servers.length >= maxSlots){
      addToast&&addToast({icon:"🚫",title:"Équipe complète",msg:"Licenciez un serveur d'abord.",color:C.red,tab:"servers"});
      return;
    }
    if(cash < candidate.hireCost){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Recrutement : ${candidate.hireCost}€ requis`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-candidate.hireCost).toFixed(2));
    addTx&&addTx("achat",`Recrutement — ${candidate.name}`,candidate.hireCost);
    setServers(p=>[...p,{
      id      : Date.now(),
      name    : candidate.name,
      status  : "actif",
      totalXp : candidate.totalXp,
      rating  : candidate.rating,
      salary  : candidate.salary,
      moral   : candidate.moral,
      specialty: candidate.specialty,
    }]);
    const remaining = candidatePool.filter(c=>c.id!==candidate.id);
    setCandidatePool(remaining);
    addToast&&addToast({icon:"👔",title:`${candidate.name} embauché·e !`,
      msg:`−${candidate.hireCost}€ · ${remaining.length} candidat${remaining.length>1?"s":""} restant${remaining.length>1?"s":""}`,
      color:C.green,tab:"servers"});
    if(remaining.length === 0 || servers.length + 1 >= maxSlots) setModal(false);
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
    const severance = (sv.salary||12) * 24; // 1 mois = 24h de salaire
    if(cash < severance){
      addToast&&addToast({icon:"❌",title:"Fonds insuffisants",
        msg:`Indemnité requise : ${severance}€`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-severance).toFixed(2));
    addTx&&addTx("dépense",`Indemnité licenciement — ${sv.name}`,severance);
    setServers(p=>p.filter(s=>s.id!==fireId));
    addToast&&addToast({icon:"👋",title:`${sv.name} licencié·e`,
      msg:`Indemnité versée : ${severance}€`,color:C.terra,tab:"servers"});
    setModal(false);
    setFireId(null);
  };

  const sColor={actif:C.green,pause:C.terra,repos:C.muted,service:C.amber,nettoyage:C.amber};
  const sBg   ={actif:C.greenP,pause:C.terraP,repos:C.bg,service:C.amberP,nettoyage:C.amberP};

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
        <Btn onClick={openHire} disabled={!canHire} v={canHire?"primary":"disabled"} icon="➕">
          Embaucher un serveur
        </Btn>
      </div>

      {/* ── Grille des serveurs ── */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13}}>
        {servers.map(sv=>{
          const sl=srvLv(sv.totalXp||0);
          const slD=SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
          const asgn=tables.filter(t=>t.server===sv.name);
          const isWorking=sv.status==="service";
          const isNettoyage=sv.status==="nettoyage";
          const cleaningTable=isNettoyage?tables.find(t=>t.cleanServer===sv.id):null;
          const cleanRemSecs=isNettoyage&&sv.cleanUntil?Math.max(0,Math.ceil((sv.cleanUntil-clockNow)/1000)):0;
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
                          :isNettoyage
                            ?`🧹 ${cleaningTable?cleaningTable.name:"..."}${cleanRemSecs>0?" · "+cleanRemSecs+"s":""}`
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
                {isWorking?(
                  <div style={{fontSize:9,color:C.amber,fontFamily:F.body,fontWeight:600,
                    background:C.amberP,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.amber}33`}}>
                    ⏳ En service
                  </div>
                ):(
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
          <div key={`free-${i}`} onClick={openHire}
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
                      {sv.specialty?.name&&` · ${sv.specialty.icon||""} ${sv.specialty.name}`}
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
      {/* ══ Modal embauche — 3 candidats ═════════════════════ */}
      {modal==="hire"&&(
        <div onClick={()=>setModal(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
            zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
              width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
              boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              position:"sticky",top:0,background:C.surface,zIndex:10}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                  👔 Candidats disponibles
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                  {candidatePool.slice(0,3).length} affiché{candidatePool.slice(0,3).length>1?"s":""} · {candidatePool.length} restant{candidatePool.length>1?"s":""} aujourd'hui · {servers.length}/{maxSlots} postes
                </div>
              </div>
              <button onClick={()=>setModal(false)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                  width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {/* Solde */}
            <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Solde disponible :</span>
              <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:F.title}}>
                {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
              </span>
            </div>

            {/* Liste des candidats */}
            <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
              {candidatePool.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontFamily:F.body}}>
                  <div style={{fontSize:32,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13,fontWeight:600}}>Plus de candidats aujourd'hui</div>
                  <div style={{fontSize:11,marginTop:4}}>Revenez demain pour de nouveaux profils</div>
                </div>
              ):candidatePool.slice(0,3).map(c=>{
                const sl = srvLv(c.totalXp);
                const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
                const canAfford = cash >= c.hireCost;
                return(
                  <div key={c.id} style={{
                    background: canAfford?C.card:C.bg,
                    border: `1.5px solid ${canAfford?slD.color+"44":C.border}`,
                    borderRadius:14,padding:"16px",
                    opacity: canAfford?1:0.65,
                  }}>
                    {/* Ligne principale */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        {/* Avatar */}
                        <div style={{width:46,height:46,background:slD.color+"1a",
                          border:`2px solid ${slD.color}33`,borderRadius:12,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                          {slD.icon}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                            {c.name}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <span style={{fontSize:10,background:slD.color+"18",color:slD.color,
                              border:`1px solid ${slD.color}33`,borderRadius:5,padding:"1px 7px",
                              fontFamily:F.body,fontWeight:700}}>
                              {slD.icon} {slD.name}
                            </span>
                            {c.specialty&&(
                              <span style={{fontSize:10,background:C.purpleP,color:C.purple,
                                border:`1px solid ${C.purple}33`,borderRadius:5,padding:"1px 7px",
                                fontFamily:F.body,fontWeight:600}}>
                                {c.specialty.icon} {c.specialty.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Coût */}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:canAfford?C.green:C.red,fontFamily:F.title}}>
                          {c.hireCost}€
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>coût recrutement</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                      {[
                        {icon:"💶",label:"Salaire",val:`${c.salary}€/h`},
                        {icon:"😊",label:"Moral",  val:`${c.moral}/100`},
                        {icon:"⭐",label:"Note",   val:`${c.rating}★`},
                        {icon:"📈",label:"XP",     val:`${c.totalXp} XP`},
                      ].map(stat=>(
                        <div key={stat.label} style={{background:C.bg,borderRadius:8,
                          padding:"7px 8px",textAlign:"center"}}>
                          <div style={{fontSize:13}}>{stat.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Spécialité détail */}
                    {c.specialty&&(
                      <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
                        borderRadius:8,padding:"7px 10px",marginBottom:10,fontSize:11,
                        color:C.purple,fontFamily:F.body}}>
                        {c.specialty.icon} <strong>{c.specialty.name}</strong> — {c.specialty.desc}
                      </div>
                    )}

                    {/* Bouton embaucher */}
                    {(()=>{
                      const slotsOk = servers.length < maxSlots;
                      const ok = canAfford && slotsOk;
                      const label = !slotsOk?"Équipe complète":!canAfford?"Fonds insuffisants":`Embaucher — ${c.hireCost}€`;
                      return(
                        <Btn full v={ok?"primary":"disabled"}
                          onClick={()=>ok&&hireCandidate(c)}
                          icon={ok?"👔":"🔒"}>
                          {label}
                        </Btn>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal==="fire"&&(()=>{
        const sv=servers.find(s=>s.id===fireId);
        if(!sv)return null;
        const totalXp    = sv.totalXp  ?? 0;
        const salary     = sv.salary    ?? 12;
        const moral      = sv.moral     ?? 100;
        const rating     = sv.rating    ?? 4.0;
        const specialty  = sv.specialty ?? null;
        const sl         = srvLv(totalXp);
        const slD        = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
        const severance  = salary * 24;
        const canAffordFire  = cash >= severance;
        const assignedTables = tables.filter(t => t.server === sv.name);
        return(
          <Modal title="👋 Licencier un serveur" onClose={()=>{setModal(false);setFireId(null);}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Profil */}
              <div style={{display:"flex",gap:14,alignItems:"center",
                background:C.bg,borderRadius:12,padding:"14px 16px"}}>
                <div style={{width:50,height:50,background:slD.color+"1a",
                  border:`2px solid ${slD.color}33`,borderRadius:12,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {slD.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                    {sv.name}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                    {slD.name} · Niv.{sl.l}
                    {specialty?.name&&` · ${specialty.icon||""} ${specialty.name}`}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {[
                  {icon:"📈",label:"XP",     val:`${totalXp} XP`},
                  {icon:"😊",label:"Moral",  val:`${moral}/100`},
                  {icon:"⭐",label:"Note",   val:`${rating.toFixed(1)}/5`},
                  {icon:"💶",label:"Salaire",val:`${salary}€/h`},
                ].map(stat=>(
                  <div key={stat.label} style={{background:C.bg,borderRadius:8,
                    padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:14}}>{stat.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Tables assignées */}
              {assignedTables.length>0&&(
                <div style={{background:C.amberP,border:`1px solid ${C.amber}33`,
                  borderRadius:8,padding:"8px 12px",fontSize:11,color:C.amber,fontFamily:F.body}}>
                  ⚠ En charge de {assignedTables.length} table{assignedTables.length>1?"s":""} : {assignedTables.map(t=>t.name).join(", ")}
                </div>
              )}

              {/* Indemnité */}
              <div style={{background:canAffordFire?C.bg:C.redP,
                border:`1.5px solid ${canAffordFire?C.border:C.red}44`,
                borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                      💸 Indemnité de licenciement
                    </div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      1 mois · {salary}€/h × 24h
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,
                    color:canAffordFire?C.ink:C.red,fontFamily:F.title}}>
                    {severance}€
                  </div>
                </div>
                {!canAffordFire&&(
                  <div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>
                    ❌ Solde insuffisant — disponible : {cash.toFixed(2)}€ / requis : {severance}€
                  </div>
                )}
              </div>

              {/* Avertissement */}
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,
                textAlign:"center",lineHeight:1.5}}>
                Cette action est <strong>irréversible</strong>.<br/>
                Tout le XP et les formations de {sv.name} seront perdus.
              </div>

              {/* Boutons */}
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>{setModal(false);setFireId(null);}}>
                  Annuler
                </Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} onClick={doFire} icon="👋">
                  {canAffordFire?`Licencier — ${severance}€`:"Fonds insuffisants"}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ══ Modal embauche — 3 candidats ═════════════════════ */}
      {modal==="hire"&&(
        <div onClick={()=>setModal(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
            zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
              width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
              boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

            {/* Header */}
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
              display:"flex",justifyContent:"space-between",alignItems:"center",
              position:"sticky",top:0,background:C.surface,zIndex:10}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                  👔 Candidats disponibles
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                  {candidatePool.slice(0,3).length} affiché{candidatePool.slice(0,3).length>1?"s":""} · {candidatePool.length} restant{candidatePool.length>1?"s":""} aujourd'hui · {servers.length}/{maxSlots} postes
                </div>
              </div>
              <button onClick={()=>setModal(false)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                  width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {/* Solde */}
            <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Solde disponible :</span>
              <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:F.title}}>
                {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
              </span>
            </div>

            {/* Liste des candidats */}
            <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
              {candidatePool.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontFamily:F.body}}>
                  <div style={{fontSize:32,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13,fontWeight:600}}>Plus de candidats aujourd'hui</div>
                  <div style={{fontSize:11,marginTop:4}}>Revenez demain pour de nouveaux profils</div>
                </div>
              ):candidatePool.slice(0,3).map(c=>{
                const sl = srvLv(c.totalXp);
                const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
                const canAfford = cash >= c.hireCost;
                return(
                  <div key={c.id} style={{
                    background: canAfford?C.card:C.bg,
                    border: `1.5px solid ${canAfford?slD.color+"44":C.border}`,
                    borderRadius:14,padding:"16px",
                    opacity: canAfford?1:0.65,
                  }}>
                    {/* Ligne principale */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        {/* Avatar */}
                        <div style={{width:46,height:46,background:slD.color+"1a",
                          border:`2px solid ${slD.color}33`,borderRadius:12,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                          {slD.icon}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                            {c.name}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <span style={{fontSize:10,background:slD.color+"18",color:slD.color,
                              border:`1px solid ${slD.color}33`,borderRadius:5,padding:"1px 7px",
                              fontFamily:F.body,fontWeight:700}}>
                              {slD.icon} {slD.name}
                            </span>
                            {c.specialty&&(
                              <span style={{fontSize:10,background:C.purpleP,color:C.purple,
                                border:`1px solid ${C.purple}33`,borderRadius:5,padding:"1px 7px",
                                fontFamily:F.body,fontWeight:600}}>
                                {c.specialty.icon} {c.specialty.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Coût */}
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:canAfford?C.green:C.red,fontFamily:F.title}}>
                          {c.hireCost}€
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>coût recrutement</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                      {[
                        {icon:"💶",label:"Salaire",val:`${c.salary}€/h`},
                        {icon:"😊",label:"Moral",  val:`${c.moral}/100`},
                        {icon:"⭐",label:"Note",   val:`${c.rating}★`},
                        {icon:"📈",label:"XP",     val:`${c.totalXp} XP`},
                      ].map(stat=>(
                        <div key={stat.label} style={{background:C.bg,borderRadius:8,
                          padding:"7px 8px",textAlign:"center"}}>
                          <div style={{fontSize:13}}>{stat.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                          <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Spécialité détail */}
                    {c.specialty&&(
                      <div style={{background:C.purpleP,border:`1px solid ${C.purple}22`,
                        borderRadius:8,padding:"7px 10px",marginBottom:10,fontSize:11,
                        color:C.purple,fontFamily:F.body}}>
                        {c.specialty.icon} <strong>{c.specialty.name}</strong> — {c.specialty.desc}
                      </div>
                    )}

                    {/* Bouton embaucher */}
                    <Btn full v={canAfford?"primary":"disabled"}
                      onClick={()=>canAfford&&hireCandidate(c)}
                      icon={canAfford?"👔":"🔒"}>
                      {canAfford?`Embaucher — ${c.hireCost}€`:"Fonds insuffisants"}
                    </Btn>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modal==="fire"&&(()=>{
        const sv=servers.find(s=>s.id===fireId);
        if(!sv)return null;
        const totalXp    = sv.totalXp  ?? 0;
        const salary     = sv.salary    ?? 12;
        const moral      = sv.moral     ?? 100;
        const rating     = sv.rating    ?? 4.0;
        const specialty  = sv.specialty ?? null;
        const sl         = srvLv(totalXp);
        const slD        = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
        const severance  = salary * 24;
        const canAffordFire  = cash >= severance;
        const assignedTables = tables.filter(t => t.server === sv.name);
        return(
          <Modal title="👋 Licencier un serveur" onClose={()=>{setModal(false);setFireId(null);}}>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Profil */}
              <div style={{display:"flex",gap:14,alignItems:"center",
                background:C.bg,borderRadius:12,padding:"14px 16px"}}>
                <div style={{width:50,height:50,background:slD.color+"1a",
                  border:`2px solid ${slD.color}33`,borderRadius:12,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                  {slD.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                    {sv.name}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                    {slD.name} · Niv.{sl.l}
                    {specialty&&` · ${specialty.icon} ${specialty.name}`}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {[
                  {icon:"📈",label:"XP",     val:`${totalXp} XP`},
                  {icon:"😊",label:"Moral",  val:`${moral}/100`},
                  {icon:"⭐",label:"Note",   val:`${(rating||0).toFixed(1)}/5`},
                  {icon:"💶",label:"Salaire",val:`${salary}€/h`},
                ].map(stat=>(
                  <div key={stat.label} style={{background:C.bg,borderRadius:8,
                    padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:14}}>{stat.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.title}}>{stat.val}</div>
                    <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Tables assignées */}
              {assignedTables.length>0&&(
                <div style={{background:C.amberP,border:`1px solid ${C.amber}33`,
                  borderRadius:8,padding:"8px 12px",fontSize:11,color:C.amber,fontFamily:F.body}}>
                  ⚠ En charge de {assignedTables.length} table{assignedTables.length>1?"s":""} : {assignedTables.map(t=>t.name).join(", ")}
                </div>
              )}

              {/* Indemnité */}
              <div style={{background:canAffordFire?C.bg:C.redP,
                border:`1.5px solid ${canAffordFire?C.border:C.red}44`,
                borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                      💸 Indemnité de licenciement
                    </div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      1 mois · {salary}€/h × 24h
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,
                    color:canAffordFire?C.ink:C.red,fontFamily:F.title}}>
                    {severance}€
                  </div>
                </div>
                {!canAffordFire&&(
                  <div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>
                    ❌ Solde insuffisant — disponible : {cash.toFixed(2)}€ / requis : {severance}€
                  </div>
                )}
              </div>

              {/* Avertissement */}
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,
                textAlign:"center",lineHeight:1.5}}>
                Cette action est <strong>irréversible</strong>.<br/>
                Tout le XP et les formations de {sv.name} seront perdus.
              </div>

              {/* Boutons */}
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>{setModal(false);setFireId(null);}}>
                  Annuler
                </Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} onClick={doFire} icon="👋">
                  {canAffordFire?`Licencier — ${severance}€`:"Fonds insuffisants"}
                </Btn>
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