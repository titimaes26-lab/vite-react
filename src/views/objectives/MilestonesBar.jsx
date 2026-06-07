import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

const MILESTONES = [
  {label:"10 clients",  key:"totalServed",  target:10,    icon:"👥"},
  {label:"50 clients",  key:"totalServed",  target:50,    icon:"🔥"},
  {label:"1k€ CA",      key:"totalRevenue", target:1000,  icon:"💶"},
  {label:"5k€ CA",      key:"totalRevenue", target:5000,  icon:"💰"},
  {label:"20k€ CA",     key:"totalRevenue", target:20000, icon:"🏆"},
  {label:"Grand Restaurant", key:"restoLevel", target:25, icon:"👑"},
];

export const MilestonesBar = memo(function MilestonesBar({ objStats, restoLvN }) {
  const { t: tl } = useLang();
  const vals = {
    totalServed: objStats?.totalServed || 0,
    totalRevenue: objStats?.totalRevenue || 0,
    restoLevel: restoLvN || 0,
  };
  return (
    <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:28}}>
      <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
        <span>🗺</span> {tl("objectives.milestones")}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:0,position:"relative"}}>
        <div style={{position:"absolute",top:"50%",left:"5%",right:"5%",height:3,background:C.border,borderRadius:99,transform:"translateY(-50%)",zIndex:0}}/>
        {MILESTONES.map((m, i) => {
          const done = (vals[m.key]||0) >= m.target;
          return (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:1}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:done?C.amber:C.bg,border:`3px solid ${done?C.amber:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:done?16:14,marginBottom:6,boxShadow:done?`0 0 0 4px ${C.amber}33`:"none",transition:"all 0.3s"}}>
                {done ? m.icon : "○"}
              </div>
              <div style={{fontSize:9,color:done?C.amber:C.muted,fontFamily:F.body,fontWeight:done?700:400,textAlign:"center",lineHeight:1.3}}>
                {m.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
