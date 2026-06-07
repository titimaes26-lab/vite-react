import { memo } from "react";
import { C, F, TABS } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const NavDesktop = memo(function NavDesktop({
  tab, setTab, complaints, setSeenIds,
  todayChallenges, challengeProgress, challengeClaimed, challengeLostToday,
  pendingClaim, kitchen, sAlerts,
}) {
  const { t: tl } = useLang();
  return (
    <div className="desktop-nav" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 16px",overflowX:"auto",boxShadow:"0 1px 0 rgba(23,18,14,0.04)"}}>
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
          }} className={active?"nav-tab nav-tab-active":"nav-tab"} style={{
            background:active?`linear-gradient(180deg,${C.green}10,${C.green}06)`:"transparent",
            color:active?C.green:C.muted,
            border:"none",
            borderBottom:active?`2.5px solid ${C.green}`:"2.5px solid transparent",
            borderRadius:active?"10px 10px 0 0":0,
            padding:"12px 16px",fontSize:12,fontWeight:active?700:400,
            cursor:"pointer",fontFamily:F.body,
            display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
            position:"relative",minHeight:44,
          }}>
            <span style={{fontSize:15,lineHeight:1}}>{t.icon}</span>
            <span>{tl("tabs."+t.id)||t.label}</span>
            {badge>0&&(
              <span className="badge-alert" style={{background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",boxShadow:`0 1px 4px ${C.red}44`,animation:"popIn 0.3s ease"}}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
