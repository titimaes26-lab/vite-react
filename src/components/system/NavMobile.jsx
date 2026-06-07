import { memo } from "react";
import { C, F, TABS } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const NavMobile = memo(function NavMobile({
  tab, setTab, complaints, setSeenIds,
  todayChallenges, challengeProgress, challengeClaimed, challengeLostToday,
  pendingClaim, kitchen, sAlerts,
}) {
  const { t: tl } = useLang();
  return (
    <div className="mobile-nav" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(23,18,14,0.07)",justifyContent:"space-around",alignItems:"stretch",paddingTop:"env(safe-area-inset-top,0px)"}}>
      {TABS.map(t=>{
        const readyChallenges=(todayChallenges||[]).filter(ch=>{
          const val=ch.key==="noLoss"?(!challengeLostToday&&(challengeProgress.served||0)>=1?1:0):
            ch.key==="fullHouse"||ch.key==="vip"?(challengeProgress[ch.key]||0):
            (challengeProgress[ch.key]||0);
          return val>=ch.target&&!(challengeClaimed||{})[ch.id];
        }).length;
        const badge=t.id==="stock"?sAlerts:t.id==="objectives"?pendingClaim.length+readyChallenges:t.id==="cuisine"?kitchen.queue.length:0;
        const active=tab===t.id;
        return(
          <button key={t.id} onClick={()=>{
            setTab(t.id);
            if(t.id==="complaints")
              setSeenIds(p=>new Set([...p,...complaints.filter(c=>c.status==="nouveau").map(c=>c.id)]));
          }} style={{
            flex:1,
            background:active?`linear-gradient(180deg,${C.green}08,transparent)`:"transparent",
            border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            padding:"7px 2px 8px",cursor:"pointer",position:"relative",
            borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
            gap:3,transition:"background 0.15s",minHeight:44,
          }}>
            <div style={{width:34,height:26,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:9,background:active?C.green+"14":"transparent",transition:"background 0.15s"}}>
              <span style={{fontSize:17,lineHeight:1,filter:active?"none":"grayscale(0.5) opacity(0.55)",transition:"filter 0.15s"}}>{t.icon}</span>
            </div>
            <span style={{fontSize:9,fontWeight:active?700:400,fontFamily:F.body,color:active?C.green:C.muted,whiteSpace:"nowrap",letterSpacing:"0.01em",lineHeight:1}}>
              {tl("tabs."+t.id)||t.label}
            </span>
            {badge>0&&(
              <span style={{position:"absolute",top:4,right:"calc(50% - 18px)",background:C.red,color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:8,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",boxShadow:`0 1px 4px ${C.red}55`,animation:"popIn 0.3s ease"}}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
