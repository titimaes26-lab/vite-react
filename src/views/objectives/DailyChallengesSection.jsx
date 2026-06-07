import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const DailyChallengesSection = memo(function DailyChallengesSection({
  todayChallenges, challengeProgress, challengeClaimed, challengeLostToday, claimChallenge,
}) {
  const { t: tl } = useLang();

  const getChallengeValue = (ch) => {
    if (ch.key === "noLoss") return !challengeLostToday && (challengeProgress.served||0) >= 1 ? 1 : 0;
    return challengeProgress[ch.key] || 0;
  };

  return (
    <div style={{background:C.purpleP,border:`1.5px solid ${C.purple}33`,borderRadius:16,padding:"18px 20px",marginBottom:28}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:20}}>🎯</span>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.purple,fontFamily:F.title}}>{tl("objectives.daily")}</div>
          <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tl("objectives.dailySubtitle")}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {(todayChallenges||[]).map(ch=>{
          const val = getChallengeValue(ch);
          const done = val >= ch.target;
          const claimed = !!(challengeClaimed||{})[ch.id];
          const pct = Math.min(100, Math.round((val / ch.target) * 100));
          return(
            <div key={ch.id} style={{
              background:claimed?C.greenP:done?C.purple+"18":C.surface,
              border:`1.5px solid ${claimed?C.green+"55":done?C.purple:C.border}`,
              borderRadius:12,padding:"12px 16px",
              display:"flex",alignItems:"center",gap:12,transition:"all 0.2s"}}>
              <span style={{fontSize:24,flexShrink:0,filter:claimed?"grayscale(1)":"none"}}>{ch.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:claimed?C.muted:done?C.purple:C.ink,fontFamily:F.title}}>
                    {ch.title}
                  </span>
                  {claimed&&<span style={{fontSize:10,background:C.green,color:"#fff",borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>{"✓ "+tl("objectives.claimed")}</span>}
                  {done&&!claimed&&<span style={{fontSize:10,background:C.purple,color:"#fff",borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,animation:"pulse 1s infinite"}}>{"🎉 "+tl("objectives.completed")}</span>}
                </div>
                <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>{ch.desc}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:99,background:claimed?C.green:done?C.purple:C.amber,width:"100%",transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.4s"}}/>
                  </div>
                  <span style={{fontSize:10,color:done?C.purple:C.muted,fontWeight:done?700:400,fontFamily:F.body,flexShrink:0}}>
                    {ch.key==="noLoss"?(challengeLostToday?"✗":"✓"):
                     ch.key==="fullHouse"||ch.key==="vip"?(val>=1?"✓":tl("objectives.waiting")):
                     `${typeof val==="number"&&ch.key==="revenue"?val.toFixed(0):val}/${ch.target}`}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",flexShrink:0}}>
                <span style={{fontSize:11,color:C.amber,fontWeight:700,fontFamily:F.body}}>💶 +{ch.reward.cash}€</span>
                <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>⭐ +{ch.reward.xp} XP</span>
                {done&&!claimed&&(
                  <button onClick={()=>claimChallenge(ch)} style={{
                    background:C.purple,color:"#fff",border:"none",borderRadius:8,
                    padding:"6px 14px",cursor:"pointer",fontFamily:F.body,fontWeight:700,
                    fontSize:12,marginTop:4,boxShadow:`0 3px 10px ${C.purple}55`}}>
                    {tl("objectives.claim")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
