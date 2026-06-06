import { useState, useCallback, memo } from "react";
import { useClockNow } from "../../contexts/ClockContext.jsx";
import { C, F, SRV_LVL, RESTO_LVL, SERVER_SLOTS_BY_LEVEL, STAFF_QUALITY_REQ } from "../../constants/gameData.js";
import { SRV_SPECIALTIES, TRAINING_CATALOG, getMaxMoral } from "../../constants/serverConstants.js";
import { Badge, Card, Btn, Modal, XpBar } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv, srvTierCap, TIER_UNLOCK_LV, SRV_MAX_XP } from "../../utils/levelUtils.js";

/* ─── Helpers locaux ────────────────────────────────── */
const moralIcon   = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralKey    = (m) => m>=70?"moralFine":m>=40?"moralTired":m>=20?"moralExhausted":"moralBurnout";
const moralColor  = (m) => m>=70 ? "#236b47" : m>=40 ? "#a86e08" : "#b83025";

const SHIFT_OPTIONS = [
  { id: null,    label: "—",               bg: "transparent",  color: "#8a7a65", border: "#ddd0b8" },
  { id: "matin", label: "🌅 07h–15h",      bg: "#fef3c7",      color: "#92400e", border: "#f59e0b" },
  { id: "soir",  label: "🌙 15h–23h",      bg: "#ede9fe",      color: "#5b21b6", border: "#8b5cf6" },
];

const ShiftPicker = ({ shift, onChange }) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,color:"#8a7a65",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",marginBottom:5,fontWeight:600}}>
      🕐 Créneau
    </div>
    <div style={{display:"flex",gap:4}}>
      {SHIFT_OPTIONS.map(opt=>(
        <button key={String(opt.id)} onClick={()=>onChange(opt.id)} style={{
          flex:1,padding:"4px 0",borderRadius:7,fontSize:10,fontWeight:700,
          fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",cursor:"pointer",
          background:shift===opt.id?opt.bg:"transparent",
          color:shift===opt.id?opt.color:"#8a7a65",
          border:`1.5px solid ${shift===opt.id?opt.border:"#ddd0b8"}`,
          transition:"all 0.12s",
        }}>{opt.label}</button>
      ))}
    </div>
  </div>
);

// Plages XP, salaire et taux de spécialité des candidats selon le niveau resto
const _candidateXpRange  = (lv) => [[0,100],[80,350],[300,800],[700,1500],[1200,2500]][Math.min(Math.floor(lv/5),4)];
const _candidateSalRange = (lv) => [[10,13],[11,15],[13,17],[15,20],[18,25]][Math.min(Math.floor(lv/5),4)];
const _candidateSpecRate = (lv) => lv<5?0.10:lv<10?0.25:lv<20?0.40:0.60;

/* ─── Status style maps ─────────────────────────────── */
const sColor={actif:C.green,pause:C.terra,repos:C.muted,service:C.amber,nettoyage:C.amber};
const sBg   ={actif:C.greenP,pause:C.terraP,repos:C.bg,service:C.amberP,nettoyage:C.amberP};

const ServerCard = memo(function ServerCard({
  sv, serviceRemSecs, cleanRemSecs, cleaningTableName, tables,
  tierCap, cash, tr, setServers, setCash, addTx, addToast, onFire, onTrain,
}) {
  const sl         = srvLv(sv.totalXp||0);
  const slD        = SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
  const asgn       = tables.filter(t=>t.server===sv.name);
  const isWorking  = sv.status==="service";
  const isNettoyage= sv.status==="nettoyage";
  const moral      = sv.moral??100;
  const mc         = moralColor(moral);
  const mi         = moralIcon(moral);
  const ml         = tr("servers."+moralKey(moral));
  const isBurnout  = moral<=10;
  const isExhausted= moral<=20;
  const sp         = sv.specialty;
  const primeCost  = 50;
  const canAffordPrime = cash>=primeCost;

  return(
    <Card accent={isBurnout?C.red+"66":slD.color+"44"}>
      {/* Ligne 1 : avatar + nom + note */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:44,height:44,background:slD.color+"1a",
            border:`2px solid ${isBurnout?C.red:slD.color}33`,borderRadius:12,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
            position:"relative"}}>
            {slD.icon}
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
                  ?`🛎 (${serviceRemSecs??0}s)`
                  :isNettoyage
                    ?`🧹 ${cleaningTableName??"..."}${cleanRemSecs>0?" · "+cleanRemSecs+"s":""}`
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
          {tr("servers.specialtyLocked")}
        </div>
      ):null}

      {/* Barre XP + plafond de tier */}
      <div style={{marginBottom:10}}>
        {sl.l >= tierCap ? (
          <>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:10,marginBottom:4,fontFamily:F.body}}>
              <span style={{color:C.muted}}>XP · Niv.{sl.l} <span style={{color:C.amber,fontWeight:700}}>{tr("servers.tierCapped")}</span></span>
              <span style={{color:C.amber,fontWeight:600}}>{sl.r}/{sl.n}</span>
            </div>
            <XpBar xp={sl.r} needed={sl.n} color={C.amber}/>
            {tierCap < 4 && (
              <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3,fontWeight:600}}>
                {tr("servers.tierNextUnlocks",{icon:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].icon,level:TIER_UNLOCK_LV[tierCap+1]})}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{display:"flex",justifyContent:"space-between",
              fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
              <span>XP · Niv.{sl.l}</span>
              <span style={{color:slD.color,fontWeight:600}}>{sl.r}/{sl.n}</span>
            </div>
            <XpBar xp={sl.r} needed={sl.n} color={slD.color}/>
          </>
        )}
      </div>

      {/* Jauge Moral */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",
          fontSize:10,marginBottom:4,fontFamily:F.body}}>
          <span style={{color:C.muted}}>{tr("servers.moralLabel")} {mi} {ml}</span>
          <span style={{fontWeight:700,color:mc}}>{moral}/100</span>
        </div>
        <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:"100%",background:mc,
            borderRadius:99,transformOrigin:"left center",transform:`scaleX(${moral/100})`,transition:"transform 0.5s ease"}}/>
        </div>
        {isBurnout&&(
          <div style={{fontSize:9,color:C.red,fontWeight:700,fontFamily:F.body,marginTop:3,
            animation:"pulse 1s infinite"}}>
            {tr("servers.burnoutWarning")}
          </div>
        )}
        {!isBurnout&&isExhausted&&(
          <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3}}>
            {tr("servers.exhaustedWarning")}
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>
        <div>{asgn.length>0?"📍 "+asgn.map(t=>t.name).join(", "):tr("servers.noTable")}</div>
        <div style={{marginTop:2}}>{tr("servers.xpInfo",{xp:sv.totalXp,salary:(sv.salary||0).toFixed(0)})}</div>
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

      <ShiftPicker shift={sv.shift??null} onChange={s=>setServers(p=>p.map(x=>x.id===sv.id?{...x,shift:s}:x))}/>

      {/* Actions */}
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {sv.status==="actif"&&!isWorking&&(
          <Btn sm v="terra" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"pause"}:x))}>
            {tr("servers.pause")}
          </Btn>
        )}
        {sv.status==="pause"&&(
          <Btn sm v="primary" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"actif"}:x))}>
            {tr("servers.activate")}
          </Btn>
        )}
        {isWorking&&(
          <span style={{fontSize:11,color:C.amber,fontFamily:F.body,alignSelf:"center"}}>
            {tr("servers.inService")}
          </span>
        )}
        {moral<60&&!isWorking&&(
          <Btn sm v={canAffordPrime?"navy":"disabled"}
            disabled={!canAffordPrime}
            onClick={()=>{
              if(!canAffordPrime)return;
              setCash&&setCash(c=>+(c-primeCost).toFixed(2));
              addTx&&addTx("achat",`Prime motivation — ${sv.name}`,primeCost);
              setServers(p=>p.map(x=>x.id!==sv.id?x:{...x,moral:Math.min(100,x.moral+50)}));
              addToast&&addToast({icon:"🎁",title:tr("servers.incentivePaid",{name:sv.name}),
                msg:tr("servers.incentiveMsg",{cost:primeCost}),color:C.navy,tab:"servers",silent:true});
            }}>
            {tr("servers.incentive",{cost:primeCost})}
          </Btn>
        )}
        {isWorking?(
          <div style={{fontSize:9,color:C.amber,fontFamily:F.body,fontWeight:600,
            background:C.amberP,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.amber}33`}}>
            {tr("servers.inServiceShort")}
          </div>
        ):(
          <Btn sm v="danger" onClick={()=>onFire(sv)}>{tr("servers.fire")}</Btn>
        )}
        <Btn sm v="secondary" onClick={()=>onTrain(sv)} icon="🎓">
          {tr("servers.train")}
        </Btn>
      </div>
    </Card>
  );
});

export function SalleSection({ servers, setServers, tables, restoLvN, cash, setCash, addTx, addToast, candidatePool, setCandidatePool, candidateDate, setCandidateDate, bp }) {
  const { t: tr } = useLang();
  const clockNow = useClockNow();

  /* ── État salle ────────────────────────────────────── */
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",status:"actif",salary:"12"});
  const [editId,setEditId]=useState(null);
  const [fireId,setFireId]=useState(null);
  const [trainId,setTrainId]=useState(null);

  const maxSlots  = SERVER_SLOTS_BY_LEVEL[restoLvN||0] ?? 2;
  const hireCost  = parseFloat(form.salary) * 3;
  const tierCap   = srvTierCap(restoLvN||0);
  const activeReq = STAFF_QUALITY_REQ.find(r => (restoLvN||0) >= r.atLv) || null;
  const canHire   = servers.length < maxSlots;
  const canAfford = cash >= hireCost;
  const nextReq   = STAFF_QUALITY_REQ.find(r => (restoLvN||0) < r.atLv) || null;
  const reqMet    = !activeReq || servers.filter(s => srvLv(s.totalXp||0).l >= activeReq.tier).length >= activeReq.count;

  /* ── Handlers salle ────────────────────────────────── */

  const doTrain = (sv, domain, level) => {
    const cost = level.cost;
    if(cash < cost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsTrain",{cost}),color:C.red,tab:"servers"});
      return;
    }
    const prevLevel = (sv.trainings||{})[domain.id] || 0;
    if(prevLevel >= domain.levels.length){
      addToast&&addToast({icon:"✅",title:tr("servers.trainingMax"),msg:tr("servers.trainingMaxMsg",{name:sv.name}),color:C.muted,tab:"servers",silent:true});
      return;
    }
    setCash&&setCash(c=>+(c-cost).toFixed(2));
    addTx&&addTx("achat",`Formation ${domain.name} N${level.l} — ${sv.name}`,cost);

    setServers(p=>p.map(s=>{
      if(s.id!==sv.id) return s;
      const newTrainings = {...(s.trainings||{}), [domain.id]: level.l};
      const newXp = Math.min(SRV_MAX_XP, s.totalXp + level.xp);
      const newMoral = Math.min(getMaxMoral({...s,trainings:newTrainings}),(s.moral??100)+level.moralBonus);
      // Assign/upgrade specialty if domain has one
      let newSpecUpgraded = s.specialtyUpgraded;
      let newSpecialty = s.specialty;
      if(level.specialtyId){
        const sp = SRV_SPECIALTIES.find(x=>x.id===level.specialtyId);
        if(!s.specialty){
          newSpecialty = sp;
        } else if(s.specialty.id===level.specialtyId && level.l===3 && !s.specialtyUpgraded){
          newSpecUpgraded = true;
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
      title:tr("servers.trainingDone",{name:sv.name,domain:domain.name,level:level.l}),
      msg:tr("servers.trainingDoneMsg",{effect:level.effect,xp:level.xp,moral:level.moralBonus}),
      color:domain.color, tab:"servers", silent:true
    });
    setModal(false);
    setTrainId(null);
  };

  // Générer un pool de 9 candidats reproductibles par date, qualité liée au niveau resto
  const generatePool = (dateStr, restoLv) => {
    let seed = dateStr.split("").reduce((a,c)=>a+c.charCodeAt(0), 0) + restoLv * 17;
    const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const names1=["Alice","Bruno","Clara","Denis","Elena","Félix","Gina","Hugo","Iris","Jean","Katia","Luc","Mona","Noé","Olivia","Paul","Rosa","Sam","Tina","Vera"];
    const names2=["Martin","Dupont","Bernard","Thomas","Robert","Petit","Moreau","Simon","Laurent","Michel"];
    const [xpMin,xpMax]   = _candidateXpRange(restoLv);
    const [salMin,salMax] = _candidateSalRange(restoLv);
    const specRate        = _candidateSpecRate(restoLv);
    return Array.from({length:9}, (_,i) => {
      const salary  = Math.round(rng()*(salMax-salMin)+salMin);
      const xp      = Math.round(rng()*(xpMax-xpMin)+xpMin);
      const moral   = Math.round(rng()*30+70);
      const hasSpec = rng() < specRate;
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
      setCandidatePool(generatePool(today, restoLvN||0));
      setCandidateDate(today);
    }
    setModal("hire");
  };

  const hireCandidate = (candidate) => {
    if(servers.length >= maxSlots){
      addToast&&addToast({icon:"🚫",title:tr("servers.teamComplete"),msg:tr("servers.teamCompleteMsg"),color:C.red,tab:"servers",silent:true});
      return;
    }
    if(cash < candidate.hireCost){
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),msg:tr("servers.noFundsHire",{cost:candidate.hireCost}),color:C.red,tab:"servers"});
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
      shift   : null,
    }]);
    const remaining = candidatePool.filter(c=>c.id!==candidate.id);
    setCandidatePool(remaining);
    addToast&&addToast({icon:"👔",title:tr("servers.hired",{name:candidate.name}),
      msg:tr("servers.hiredMsg",{cost:candidate.hireCost,remaining:remaining.length,s:remaining.length>1?"s":""}),
      color:C.green,tab:"servers",silent:true});
    if(remaining.length === 0 || servers.length + 1 >= maxSlots) setModal(false);
  };

  const openEdit = (sv) => {
    setEditId(sv.id);
    setForm({name:sv.name,status:sv.status,salary:String(sv.salary||12)});
    setModal("edit");
  };

  const openTrain = useCallback((sv) => {
    setTrainId(sv.id);
    setModal("train");
  }, []);

  const openFire = useCallback((sv) => {
    setFireId(sv.id);
    setModal("fire");
  }, []);

  const save = () => {
    if(!form.name.trim()) return;
    if(modal==="add"){
      if(!canAfford){ addToast&&addToast({icon:"❌",title:"Fonds insuffisants",msg:`Recrutement : ${hireCost}€ requis`,color:C.red,tab:"servers"}); return; }
      setCash&&setCash(c=>+(c-hireCost).toFixed(2));
      addTx&&addTx("achat",`Recrutement — ${form.name}`,hireCost);
      setServers(p=>[...p,{id:Date.now(),name:form.name,status:form.status,totalXp:0,rating:4.0,salary:+(form.salary||12)}]);
      addToast&&addToast({icon:"👔",title:`${form.name} embauché·e !`,msg:`−${hireCost}€ · Salaire ${form.salary}€/h`,color:C.green,tab:"servers",silent:true});
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
      addToast&&addToast({icon:"❌",title:tr("servers.noFunds"),
        msg:`${tr("servers.severance")} : ${severance}€`,color:C.red,tab:"servers"});
      return;
    }
    setCash&&setCash(c=>+(c-severance).toFixed(2));
    addTx&&addTx("dépense",`Indemnité licenciement — ${sv.name}`,severance);
    setServers(p=>p.filter(s=>s.id!==fireId));
    addToast&&addToast({icon:"👋",title:tr("servers.fired",{name:sv.name}),
      msg:tr("servers.firedMsg",{cost:severance}),color:C.terra,tab:"servers",silent:true});
    setModal(false);
    setFireId(null);
  };

  return (
    <>
      {/* ── Header barre ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15,fontWeight:700,color:C.ink,fontFamily:F.title}}>
            {tr("servers.team",{count:servers.length,max:maxSlots})}
          </span>
          <span style={{fontSize:11,background:canHire?C.greenP:C.redP,
            color:canHire?C.green:C.red,border:`1px solid ${canHire?C.green:C.red}33`,
            borderRadius:20,padding:"2px 10px",fontFamily:F.body,fontWeight:600}}>
            {canHire?tr("servers.slotsAvailable",{n:maxSlots-servers.length,s:maxSlots-servers.length>1?"s":""}):tr("servers.teamFull")}
          </span>
        </div>
        <Btn onClick={openHire} disabled={!canHire} v={canHire?"primary":"disabled"} icon="➕">
          {tr("servers.hire")}
        </Btn>
      </div>

      {/* ── Bandeau exigences & plafond ── */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>

        {/* Plafond de tier */}
        <div style={{flex:1,minWidth:200,background:C.navyP,border:`1px solid ${C.navy}33`,
          borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🎓</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.navy,fontFamily:F.body}}>
              {tr("servers.tierMax",{icon:SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].icon,name:SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].name})}
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
              {tierCap < 4
                ? tr("servers.tierUnlocks",{icon:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].icon,name:SRV_LVL[Math.min(tierCap+1,SRV_LVL.length-1)].name,level:TIER_UNLOCK_LV[tierCap+1]})
                : tr("servers.allTiersUnlocked")}
            </div>
          </div>
        </div>

        {/* Exigence de personnel */}
        <div style={{flex:1,minWidth:200,
          background:activeReq?(reqMet?C.greenP:C.redP):C.bg,
          border:`1px solid ${activeReq?(reqMet?C.green:C.red):C.border}33`,
          borderRadius:10,padding:"9px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{activeReq?(reqMet?"✅":"⚠️"):"🟢"}</span>
          <div style={{flex:1}}>
            {activeReq ? (
              <>
                <div style={{fontSize:11,fontWeight:700,
                  color:reqMet?C.green:C.red,fontFamily:F.body}}>
                  {reqMet?tr("servers.reqMet"):tr("servers.reqNotMet")} — {activeReq.icon} {activeReq.label}
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {reqMet
                    ? nextReq
                      ? tr("servers.nextReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv})
                      : tr("servers.maxReq")
                    : tr("servers.recruitOrTrain")}
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:F.body}}>
                  {tr("servers.noReq")}
                </div>
                <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>
                  {nextReq ? tr("servers.firstReq",{icon:nextReq.icon,label:nextReq.label,level:nextReq.atLv}) : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Grille des serveurs ── */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:13}}>
        {servers.map(sv=>{
          const isWorking  = sv.status==="service";
          const isNettoyage= sv.status==="nettoyage";
          const cleaningTable = isNettoyage?tables.find(t=>t.cleanServer===sv.id):null;
          const serviceRemSecs = isWorking&&sv.serviceUntil
            ? Math.max(0,Math.ceil((sv.serviceUntil-clockNow)/1000)) : null;
          const cleanRemSecs = isNettoyage&&sv.cleanUntil
            ? Math.max(0,Math.ceil((sv.cleanUntil-clockNow)/1000)) : 0;
          return(
            <ServerCard
              key={sv.id}
              sv={sv}
              serviceRemSecs={serviceRemSecs}
              cleanRemSecs={cleanRemSecs}
              cleaningTableName={cleaningTable?.name??null}
              tables={tables}
              tierCap={tierCap}
              cash={cash}
              tr={tr}
              setServers={setServers}
              setCash={setCash}
              addTx={addTx}
              addToast={addToast}
              onFire={openFire}
              onTrain={openTrain}
            />
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
              {tr("servers.freeSlot")}
            </div>
            <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>
              {tr("servers.clickHire")}
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
                  {tr("servers.lockedSlot")}
                </div>
                {r&&<span style={{fontSize:11,background:r.color+"18",color:r.color,
                  border:`1px solid ${r.color}33`,borderRadius:6,padding:"2px 8px",
                  fontFamily:F.body,fontWeight:600}}>
                  {tr("servers.levelUnlock",{icon:r.icon,level:r.l,name:r.name})}
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
                      {tr("servers.trainTitle",{name:sv.name})}
                    </div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      {tr("servers.trainSubtitle",{level:sl.l,xp:sv.totalXp,moral:sv.moral??100})}
                      {sv.specialty?.name&&` · ${sv.specialty.icon||""} ${sv.specialty.name}`}
                    </div>
                  </div>
                </div>
                <button onClick={()=>{setModal(false);setTrainId(null);}}
                  style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                    width:44,height:44,cursor:"pointer",fontSize:18,color:C.muted,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>

              {/* Solde */}
              <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("servers.balance")}</span>
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
                                    {tr("servers.levelN",{n:level.l,name:level.name})}
                                  </span>
                                  {isDone&&<span style={{fontSize:9,background:C.green,color:"#fff",
                                    borderRadius:99,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>
                                    {tr("servers.acquired")}
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
                                    {canAffordThis?tr("servers.fund"):tr("servers.noFunds")}
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
                  {tr("servers.candidates")}
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>
                  {tr("servers.candidatesInfo",{shown:candidatePool.slice(0,3).length,s:candidatePool.slice(0,3).length>1?"s":"",total:candidatePool.length,hired:servers.length,max:maxSlots})}
                </div>
              </div>
              <button onClick={()=>setModal(false)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
                  width:32,height:32,cursor:"pointer",fontSize:16,color:C.muted,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {/* Solde + plafond de tier */}
            <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Solde :</span>
                <span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:F.title}}>
                  {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,
                background:C.navyP,border:`1px solid ${C.navy}22`,borderRadius:7,
                padding:"3px 10px"}}>
                <span style={{fontSize:11}}>🎓</span>
                <span style={{fontSize:10,color:C.navy,fontWeight:600,fontFamily:F.body}}>
                  Candidats niv. {restoLvN||0} · Tier max : {SRV_LVL[Math.min(tierCap,SRV_LVL.length-1)].name}
                </span>
              </div>
            </div>

            {/* Liste des candidats */}
            <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
              {candidatePool.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontFamily:F.body}}>
                  <div style={{fontSize:32,marginBottom:8}}>📅</div>
                  <div style={{fontSize:13,fontWeight:600}}>{tr("servers.noCandidates")}</div>
                  <div style={{fontSize:11,marginTop:4}}>{tr("servers.noCandidatesMsg")}</div>
                </div>
              ):candidatePool.slice(0,3).map(c=>{
                const sl = srvLv(c.totalXp);
                const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];
                const canAffordC = cash >= c.hireCost;
                return(
                  <div key={c.id} style={{
                    background: canAffordC?C.card:C.bg,
                    border: `1.5px solid ${canAffordC?slD.color+"44":C.border}`,
                    borderRadius:14,padding:"16px",
                    opacity: canAffordC?1:0.65,
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
                        <div style={{fontSize:16,fontWeight:800,color:canAffordC?C.green:C.red,fontFamily:F.title}}>
                          {c.hireCost}€
                        </div>
                        <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tr("servers.hireCost")}</div>
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
                    <Btn full v={canAffordC?"primary":"disabled"}
                      onClick={()=>canAffordC&&hireCandidate(c)}
                      icon={canAffordC?"👔":"🔒"}>
                      {canAffordC?tr("servers.hireBtn",{cost:c.hireCost}):tr("servers.noFunds")}
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
          <Modal title={tr("servers.fireTitle")} onClose={()=>{setModal(false);setFireId(null);}}>
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
                  {tr("servers.assignedTo",{count:assignedTables.length,s:assignedTables.length>1?"s":"",tables:assignedTables.map(t=>t.name).join(", ")})}
                </div>
              )}

              {/* Indemnité */}
              <div style={{background:canAffordFire?C.bg:C.redP,
                border:`1.5px solid ${canAffordFire?C.border:C.red}44`,
                borderRadius:10,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.ink,fontFamily:F.body}}>
                      {tr("servers.severance")}
                    </div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:2}}>
                      {tr("servers.severanceDetail",{salary})}
                    </div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,
                    color:canAffordFire?C.ink:C.red,fontFamily:F.title}}>
                    {severance}€
                  </div>
                </div>
                {!canAffordFire&&(
                  <div style={{marginTop:8,fontSize:10,color:C.red,fontFamily:F.body,fontWeight:600}}>
                    {tr("servers.insufficientFire",{available:cash.toFixed(2),required:severance})}
                  </div>
                )}
              </div>

              {/* Avertissement */}
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,
                textAlign:"center",lineHeight:1.5}}>
                <span dangerouslySetInnerHTML={{__html:tr("servers.irreversible")}}/><br/>
                {tr("servers.fireWarning",{name:sv.name})}
              </div>

              {/* Boutons */}
              <div style={{display:"flex",gap:10}}>
                <Btn full v="ghost" onClick={()=>{setModal(false);setFireId(null);}}>
                  {tr("app.cancel")}
                </Btn>
                <Btn full v={canAffordFire?"danger":"disabled"} onClick={doFire} icon="👋">
                  {canAffordFire?tr("servers.fireConfirm",{cost:severance}):tr("servers.noFunds")}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}
