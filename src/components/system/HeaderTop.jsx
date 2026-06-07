import { memo } from "react";
import { C, F, RESTO_LVL } from "../../constants/gameData.js";
import { getRepTier } from "../../constants/gameConstants.js";
import { triggerAd } from "../../services/adBridge.js";
import { useLang } from "../../i18n/index.jsx";

export const HeaderTop = memo(function HeaderTop({
  bp, sAlerts, nCompl, queue,
  phase, gameTime, loan, openBank,
  setShowToastHistory, setToastUnread, toastUnread,
  adWatching, setAdWatching, setCash, addTx, addToast,
  setShowHelp, setShowResetModal,
  rl, rlD, restoXp, reputation,
  complaints, setSeenIds, setTab, activeTables,
}) {
  const { t: tl } = useLang();
  return (
    <div style={{
      background:`linear-gradient(180deg,${C.surface} 0%,#faf7f0 100%)`,
      borderBottom:`1px solid ${C.border}`,
      boxShadow:"0 2px 14px rgba(23,18,14,0.08), 0 1px 3px rgba(23,18,14,0.04)",
    }}>
      {/* Row 1: logo · alerts · clock · actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:bp.isMobile?"0 10px":"0 16px",minHeight:bp.isMobile?46:52,gap:8,
        flexWrap:bp.isMobile?"wrap":"nowrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,minWidth:0}}>
          <div style={{width:38,height:38,background:`linear-gradient(135deg,${C.green} 0%,${C.greenL||"#2d7a50"} 100%)`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,boxShadow:`0 3px 10px ${C.green}38`}}>🍽</div>
          <div style={{minWidth:0}}>
            <div className={bp.isSmall?"hide-mobile":""} style={{fontSize:bp.isMobile?13:15,fontWeight:800,color:C.ink,fontFamily:F.title,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"-0.02em",lineHeight:1.2}}>
              Le Grand Restaurant
            </div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,flexWrap:bp.isMobile?"wrap":"nowrap",justifyContent:"flex-end"}}>
          {sAlerts>0&&(
            <div style={{background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,boxShadow:`0 1px 4px ${C.red}18`}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:C.red,animation:"pulse 1.2s infinite",display:"inline-block",flexShrink:0}}/>
              ⚠ {sAlerts}
            </div>
          )}
          {nCompl>0&&(
            <button onClick={()=>{setTab("complaints");setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));}} style={{background:C.terraP,border:`1.5px solid ${C.terra}28`,borderRadius:8,padding:"7px 9px",fontSize:10,color:C.terra,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:F.body,boxShadow:`0 1px 4px ${C.terra}18`,minHeight:44,display:"flex",alignItems:"center"}}>
              💬 {nCompl}
            </button>
          )}
          {queue.length>=5&&(
            <div style={{background:C.redP,border:`1.5px solid ${C.red}28`,borderRadius:8,padding:"3px 9px",fontSize:10,color:C.red,fontWeight:700,whiteSpace:"nowrap",animation:"pulse 1.2s ease-in-out infinite"}}>🚨</div>
          )}
          <div style={{textAlign:"right",flexShrink:0,background:C.bg,border:`1px solid ${phase?.color||C.border}44`,borderRadius:8,padding:"3px 9px"}}>
            <div style={{fontSize:16,fontWeight:800,color:phase?.color||C.ink,fontFamily:F.title,lineHeight:1.1,letterSpacing:"-0.02em"}}>
              {phase?.icon} {gameTime.str}
            </div>
            <div style={{fontSize:8,color:C.muted,whiteSpace:"nowrap",marginTop:1}}>
              {phase?.label} · {activeTables.filter(t=>t.status==="occupée"||t.status==="mange").length}/{activeTables.length} tables
            </div>
          </div>
          <button onClick={openBank} title="Banque" style={{padding:"5px 11px",fontSize:11,fontWeight:700,background:loan?C.amber:C.navy,border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontFamily:F.body,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0,minHeight:44,boxShadow:loan?`0 2px 8px ${C.amber}55`:`0 2px 8px ${C.navy}33`,animation:loan?"bankPulse 2s ease-in-out infinite":"none"}}>
            🏦{!bp.isSmall&&<span>{tl("bank.title")}</span>}
          </button>
          <div style={{position:"relative",flexShrink:0}}>
            <button onClick={()=>{setShowToastHistory(true);setToastUnread(0);}} title="Notifications" style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.amber}44`,background:C.amberP,cursor:"pointer",fontSize:18,color:C.amber,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 7px ${C.amber}20`}}>🔔</button>
            {toastUnread>0&&(
              <div style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:800,fontFamily:F.body,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",border:`1.5px solid ${C.surface}`,pointerEvents:"none"}}>
                {toastUnread>99?"99+":toastUnread}
              </div>
            )}
          </div>
          <button disabled={adWatching} onClick={()=>{setAdWatching(true);triggerAd("rewarded",{onRewarded:()=>{setCash(c=>+(c+1000).toFixed(2));addTx("revenu","Bonus pub vidéo",1000);addToast({icon:"📺",title:"+1 000 € · Pub regardée !"});setAdWatching(false);}});}} title="+1 000€ en regardant une pub" style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,padding:"4px 9px",borderRadius:7,minHeight:44,background:adWatching?C.amberP:C.greenP,border:`1.5px solid ${adWatching?C.amber:C.green}55`,cursor:adWatching?"not-allowed":"pointer",opacity:adWatching?0.7:1,transition:"all 0.2s"}}>
            <span style={{fontSize:13,animation:adWatching?"pulse 0.8s ease-in-out infinite":undefined}}>{adWatching?"⏳":"📺"}</span>
            <span style={{fontSize:11,fontWeight:700,color:adWatching?C.amber:C.green,whiteSpace:"nowrap"}}>{adWatching?"...":"+1 000€"}</span>
          </button>
          <button onClick={()=>setShowHelp(true)} title="Guide utilisateur" style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.green}44`,background:C.greenP,cursor:"pointer",fontSize:16,color:C.green,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,boxShadow:`0 2px 7px ${C.green}20`}}>?</button>
          <button onClick={()=>setShowResetModal(true)} title="Nouvelle partie" style={{width:44,height:44,borderRadius:"50%",border:`1.5px solid ${C.red}33`,background:C.redP,cursor:"pointer",fontSize:15,color:C.red,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,opacity:0.65}}>↺</button>
        </div>
      </div>

      {/* Row 2: level + reputation */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:bp.isMobile?"5px 10px 7px":"6px 16px 9px",display:"flex",alignItems:"center",gap:bp.isMobile?6:10,background:`linear-gradient(180deg,${C.bg}90,${C.bg})`,flexWrap:bp.isMobile?"wrap":"nowrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,...(bp.isMobile?{width:"100%"}:{flexShrink:0})}}>
          <span style={{fontSize:18}}>{rlD.icon}</span>
          <span style={{fontSize:14,fontWeight:700,color:rlD.color,fontFamily:F.title,whiteSpace:"nowrap"}}>{rlD.name}</span>
          <span style={{fontSize:11,background:rlD.color+"18",color:rlD.color,border:`1px solid ${rlD.color}33`,borderRadius:4,padding:"1px 6px",fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>N{rlD.l}</span>
          <span style={{fontSize:11,color:C.muted,fontFamily:F.body,whiteSpace:"nowrap"}}>
            {rl.l>=RESTO_LVL.length-1?"✦ Max":`${restoXp}/${rl.next.xpNeeded} XP`}
          </span>
        </div>
        {(()=>{
          const tier=getRepTier(reputation);
          return(
            <div title={`${tier.label} — ${tier.desc}`} style={{display:"flex",alignItems:"center",gap:5,flexShrink:0,background:tier.color+"14",border:`1px solid ${tier.color}33`,borderRadius:7,padding:"3px 8px",cursor:"default"}}>
              <span style={{fontSize:16}}>{tier.icon}</span>
              <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:60}}>
                <div style={{height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:"100%",background:tier.color,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${reputation/100})`,transition:"transform 0.6s ease"}}/>
                </div>
                <div style={{fontSize:11,color:tier.color,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap",lineHeight:1}}>
                  {tier.label} · {Math.round(reputation)}/100
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});
