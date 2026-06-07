import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const PhaseTimeline = memo(function PhaseTimeline({
  tLive, kitchen, now,
  isOrdering, isMange, isNettoyage,
  secsLeft, eatSecsLeft, eatPct, cleanSecsLeft, cleanPct,
}) {
  const { t: tr } = useLang();
  const isCooking = tLive.status === "occupée" && !isOrdering;
  const panelCooking = kitchen.cooking.filter(d => d.tableId === tLive.id);
  const panelSlowest = panelCooking.length > 0
    ? panelCooking.reduce((a, b) => (b.startedAt + b.timerMax * 1000) > (a.startedAt + a.timerMax * 1000) ? b : a)
    : null;
  const panelCookPct = panelSlowest
    ? Math.min(100, Math.round(((now - panelSlowest.startedAt) / (panelSlowest.timerMax * 1000)) * 100))
    : isCooking ? null : (isMange || isNettoyage) ? 100 : 0;
  const panelCookRemaining = panelSlowest
    ? Math.max(0, Math.ceil((panelSlowest.startedAt + panelSlowest.timerMax * 1000 - now) / 1000))
    : null;

  const phases = [
    { id:"commande", icon:"🛎", label:tr("tables.phaseOrder"), color:C.navy,
      done:!isOrdering&&(isCooking||isMange||isNettoyage), active:isOrdering,
      pct:isOrdering?Math.min(100,Math.round((1-secsLeft/((tLive.svcUntil-tLive.placedAt)/1000||30))*100)):100,
      timer:isOrdering?secsLeft:null },
    { id:"cuisine", icon:"🔥", label:tr("tables.phaseKitchen"), color:C.terra,
      done:isMange||isNettoyage, active:isCooking, pct:panelCookPct, timer:panelCookRemaining },
    { id:"repas", icon:"🍴", label:tr("tables.phaseEating"), color:C.green,
      done:isNettoyage, active:isMange,
      pct:isMange?(eatSecsLeft>0?eatPct:100):isNettoyage?100:0,
      timer:eatSecsLeft>0?eatSecsLeft:null },
    { id:"nettoyage", icon:"🧹", label:tr("tables.phaseCleaning"), color:C.amber,
      done:false, active:isNettoyage, pct:isNettoyage?cleanPct:0, timer:isNettoyage?cleanSecsLeft:null },
  ];

  const activeP = phases.find(p => p.active);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
        {phases.map((ph, pi) => (
          <div key={ph.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
            {pi>0&&<div style={{position:"absolute",left:0,top:11,width:"50%",height:2,background:phases[pi-1].done||phases[pi-1].active?ph.color+"55":C.border}}/>}
            {pi<phases.length-1&&<div style={{position:"absolute",right:0,top:11,width:"50%",height:2,background:ph.done?ph.color+"55":C.border}}/>}
            <div style={{
              width:24,height:24,borderRadius:"50%",zIndex:1,position:"relative",
              background:ph.done?"#fff":ph.active?ph.color:C.bg,
              border:`2px solid ${ph.done||ph.active?ph.color:C.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
              boxShadow:ph.active?`0 0 0 4px ${ph.color}22`:"none",transition:"all 0.3s",
            }}>
              {ph.done?<span style={{color:ph.color,fontWeight:800,fontSize:11}}>✓</span>
                :ph.active?<span style={{animation:ph.pct===null?"pulse 1s infinite":undefined}}>{ph.icon}</span>
                :<span style={{fontSize:8,color:C.muted,fontWeight:700}}>{pi+1}</span>}
            </div>
            <div style={{fontSize:8,color:ph.active?ph.color:ph.done?ph.color+"88":C.muted,
              fontWeight:ph.active?700:400,marginTop:4,fontFamily:F.body,whiteSpace:"nowrap"}}>
              {ph.label}
            </div>
          </div>
        ))}
      </div>
      {activeP&&(
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:10,fontFamily:F.body}}>
            <span style={{color:activeP.color,fontWeight:700}}>{tr("tables.phaseInProgress",{icon:activeP.icon,label:activeP.label})}</span>
            {activeP.timer!==null&&<span style={{color:C.muted,fontWeight:600}}>
              {Math.floor(activeP.timer/60)}:{String(activeP.timer%60).padStart(2,"0")}
            </span>}
          </div>
          <div style={{height:8,background:C.border,borderRadius:99,overflow:"hidden",position:"relative"}}>
            {activeP.pct===null
              ?<div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${activeP.color}77,transparent)`,backgroundSize:"200% 100%",animation:"shimmerBar 1.6s ease-in-out infinite"}}/>
              :<div style={{width:"100%",height:"100%",background:`linear-gradient(90deg,${activeP.color}cc,${activeP.color})`,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${activeP.pct/100})`,transition:"transform 0.5s linear",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)",backgroundSize:"200% 100%",animation:"shimmerBar 2s ease-in-out infinite"}}/>
              </div>
            }
          </div>
        </div>
      )}
    </div>
  );
});
