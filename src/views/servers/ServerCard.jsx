import { memo } from "react";
import { C, F, SRV_LVL } from "../../constants/gameData.js";
import { Badge, Card, XpBar } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";
import { srvLv, TIER_UNLOCK_LV } from "../../utils/levelUtils.js";
import { ServerActions } from "./ServerActions.jsx";

const moralIcon  = (m) => m>=70?"😊":m>=40?"😐":m>=20?"😓":"💀";
const moralKey   = (m) => m>=70?"moralFine":m>=40?"moralTired":m>=20?"moralExhausted":"moralBurnout";
const moralColor = (m) => m>=70 ? "#236b47" : m>=40 ? "#a86e08" : "#b83025";

const SHIFT_OPTIONS = [
  { id: null,    label: "—",          bg: "transparent", color: "#8a7a65", border: "#ddd0b8" },
  { id: "matin", label: "🌅 07h–15h", bg: "#fef3c7",     color: "#92400e", border: "#f59e0b" },
  { id: "soir",  label: "🌙 15h–23h", bg: "#ede9fe",     color: "#5b21b6", border: "#8b5cf6" },
];

const ShiftPicker = ({ shift, onChange }) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,color:"#8a7a65",fontFamily:F.body,marginBottom:5,fontWeight:600}}>
      🕐 Créneau
    </div>
    <div style={{display:"flex",gap:4}}>
      {SHIFT_OPTIONS.map(opt=>(
        <button key={String(opt.id)} onClick={()=>onChange(opt.id)} style={{
          flex:1,padding:"4px 0",borderRadius:7,fontSize:10,fontWeight:700,
          fontFamily:F.body,cursor:"pointer",
          background:shift===opt.id?opt.bg:"transparent",
          color:shift===opt.id?opt.color:"#8a7a65",
          border:`1.5px solid ${shift===opt.id?opt.border:"#ddd0b8"}`,
          transition:"all 0.12s",
        }}>{opt.label}</button>
      ))}
    </div>
  </div>
);

const sColor = {actif:C.green,pause:C.terra,repos:C.muted,service:C.amber,nettoyage:C.amber};
const sBg    = {actif:C.greenP,pause:C.terraP,repos:C.bg,service:C.amberP,nettoyage:C.amberP};

export const ServerCard = memo(function ServerCard({
  sv, serviceRemSecs, cleanRemSecs, cleaningTableName, tables,
  tierCap, cash, setServers, setCash, addTx, addToast, onFire, onTrain,
}) {
  const { t: tr } = useLang();
  const sl          = srvLv(sv.totalXp||0);
  const slD         = SRV_LVL[Math.min(sl.l,SRV_LVL.length-1)];
  const asgn        = tables.filter(t=>t.server===sv.name);
  const isWorking   = sv.status==="service";
  const isNettoyage = sv.status==="nettoyage";
  const moral       = sv.moral??100;
  const mc          = moralColor(moral);
  const mi          = moralIcon(moral);
  const ml          = tr("servers."+moralKey(moral));
  const isBurnout   = moral<=10;
  const isExhausted = moral<=20;
  const sp          = sv.specialty;

  return(
    <Card accent={isBurnout?C.red+"66":slD.color+"44"}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:44,height:44,background:slD.color+"1a",
            border:`2px solid ${isBurnout?C.red:slD.color}33`,borderRadius:12,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>
            {slD.icon}
            <div style={{position:"absolute",bottom:-5,right:-5,width:18,height:18,borderRadius:"50%",
              fontSize:10,background:C.surface,border:`1.5px solid ${mc}`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>{mi}</div>
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

      {sp?(
        <div style={{background:sp.color+"12",border:`1px solid ${sp.color}33`,
          borderRadius:8,padding:"6px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
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
          borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:10,color:C.muted,fontFamily:F.body}}>
          {tr("servers.specialtyLocked")}
        </div>
      ):null}

      <div style={{marginBottom:10}}>
        {sl.l >= tierCap ? (
          <>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4,fontFamily:F.body}}>
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
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
              <span>XP · Niv.{sl.l}</span>
              <span style={{color:slD.color,fontWeight:600}}>{sl.r}/{sl.n}</span>
            </div>
            <XpBar xp={sl.r} needed={sl.n} color={slD.color}/>
          </>
        )}
      </div>

      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4,fontFamily:F.body}}>
          <span style={{color:C.muted}}>{tr("servers.moralLabel")} {mi} {ml}</span>
          <span style={{fontWeight:700,color:mc}}>{moral}/100</span>
        </div>
        <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:"100%",background:mc,borderRadius:99,
            transformOrigin:"left center",transform:`scaleX(${moral/100})`,transition:"transform 0.5s ease"}}/>
        </div>
        {isBurnout&&(
          <div style={{fontSize:9,color:C.red,fontWeight:700,fontFamily:F.body,marginTop:3,animation:"pulse 1s infinite"}}>
            {tr("servers.burnoutWarning")}
          </div>
        )}
        {!isBurnout&&isExhausted&&(
          <div style={{fontSize:9,color:C.amber,fontFamily:F.body,marginTop:3}}>
            {tr("servers.exhaustedWarning")}
          </div>
        )}
      </div>

      <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>
        <div>{asgn.length>0?"📍 "+asgn.map(t=>t.name).join(", "):tr("servers.noTable")}</div>
        <div style={{marginTop:2}}>{tr("servers.xpInfo",{xp:sv.totalXp,salary:(sv.salary||0).toFixed(0)})}</div>
      </div>

      <ShiftPicker shift={sv.shift??null} onChange={s=>setServers(p=>p.map(x=>x.id===sv.id?{...x,shift:s}:x))}/>

      <ServerActions
        sv={sv} cash={cash} setServers={setServers} setCash={setCash}
        addTx={addTx} addToast={addToast} onFire={onFire} onTrain={onTrain}
      />
    </Card>
  );
});
