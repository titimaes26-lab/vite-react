import { C, F, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS } from "../constants/gameData.js";
import { Btn } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";
import { DailyChallengesSection } from "./objectives/DailyChallengesSection.jsx";
import { MilestonesBar } from "./objectives/MilestonesBar.jsx";

export function ObjectivesView({objStats,completedIds,onClaim,pendingClaim,todayChallenges,challengeProgress,challengeClaimed,setChallengeClaimed,challengeLostToday,setCash,addTx,addRestoXp,addToast,restoXp,restoLvN,bp={}}){
  const { t: tl } = useLang();
  const series = [1,2,3,4];

  const claimChallenge = (ch) => {
    if(challengeClaimed[ch.id]) return;
    setChallengeClaimed(p=>({...p,[ch.id]:true}));
    setCash(c=>+(c+ch.reward.cash).toFixed(2));
    addTx("revenu",`Défi quotidien : ${ch.title}`,ch.reward.cash);
    addRestoXp(ch.reward.xp);
    addToast({icon:ch.icon,title:tl("objectives.claimedToast",{amount:ch.reward.cash}),
      msg:`${ch.title} · +${ch.reward.xp} XP`,color:C.purple,tab:"objectives"});
  };

  return(
    <div style={{maxWidth:800,margin:"0 auto",padding:"10px 0"}}>

      <DailyChallengesSection
        todayChallenges={todayChallenges}
        challengeProgress={challengeProgress}
        challengeClaimed={challengeClaimed}
        challengeLostToday={challengeLostToday}
        claimChallenge={claimChallenge}/>

      <MilestonesBar objStats={objStats} restoLvN={restoLvN}/>

      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":bp.isTablet?"repeat(2,1fr)":"repeat(4,1fr)",gap:bp.isMobile?8:12,marginBottom:28}}>
        {series.map(s=>{
          const all=OBJECTIVES_DEF.filter(o=>o.series===s);
          const done=all.filter(o=>completedIds.includes(o.id)).length;
          const pct=Math.round(done/all.length*100);
          const col=SERIES_COLORS[s];
          return(
            <div key={s} style={{background:col+"14",border:`1.5px solid ${col}22`,borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:col,fontFamily:F.title}}>{done}/{all.length}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>{SERIES_LABELS[s]}</div>
              <div style={{background:C.border,borderRadius:99,height:5}}>
                <div style={{width:"100%",height:"100%",background:col,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${pct/100})`,transition:"transform 0.4s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {series.map(s=>{
        const objs=OBJECTIVES_DEF.filter(o=>o.series===s);
        const col=SERIES_COLORS[s];
        return(
          <div key={s} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:3,height:20,background:col,borderRadius:99}}/>
              <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:F.title}}>{SERIES_LABELS[s]}</div>
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
                    opacity:done&&!isPending?0.6:1,transition:"all 0.2s"}}>
                    <div style={{fontSize:28,flexShrink:0,filter:done&&!isPending?"grayscale(1)":"none"}}>{obj.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:isPending?col:done?C.muted:C.ink,fontFamily:F.title}}>
                          {obj.title}
                        </span>
                        {done&&!isPending&&<span style={{fontSize:10,background:C.green,color:"#fff",borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>{"✓ "+tl("objectives.milestoneDone")}</span>}
                        {isPending&&<span style={{fontSize:10,background:col,color:"#fff",borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,animation:"pulse 1s infinite"}}>{"🎉 "+tl("objectives.milestoneReady")}</span>}
                      </div>
                      <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:6}}>{obj.desc}</div>
                      <div style={{display:"flex",gap:10}}>
                        <span style={{fontSize:11,color:C.amber,fontFamily:F.body,fontWeight:600}}>💶 +{obj.reward.cash} €</span>
                        <span style={{fontSize:11,color:C.green,fontFamily:F.body,fontWeight:600}}>⭐ +{obj.reward.xp} XP resto</span>
                      </div>
                    </div>
                    {isPending&&(
                      <button onClick={()=>onClaim(obj.id)} style={{
                        background:col,color:"#fff",border:"none",borderRadius:10,
                        padding:"10px 18px",cursor:"pointer",fontFamily:F.body,
                        fontWeight:700,fontSize:13,flexShrink:0,boxShadow:`0 4px 14px ${col}55`}}>
                        {tl("objectives.milestoneBtn")}
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
