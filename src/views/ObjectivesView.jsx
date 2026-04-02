/* ═══════════════════════════════════════════════════════
   src/views/ObjectivesView.jsx
   Vue des objectifs de progression et défis quotidiens.
═══════════════════════════════════════════════════════ */
import { useState } from "react";
import { C, F, OBJECTIVES_DEF, SERIES_LABELS, SERIES_COLORS,
         CHALLENGES_POOL } from "../constants/gameData.js";
import { Btn } from "../components/ui/index.js";
import { restoLv } from "../utils/levelUtils.js";

export function ObjectivesView({objStats,completedIds,onClaim,pendingClaim,todayChallenges,challengeProgress,challengeClaimed,setChallengeClaimed,challengeLostToday,setCash,addTx,addRestoXp,addToast,restoXp,restoLvN,bp={}}){
  const series=[1,2,3,4];

  const claimChallenge=(ch)=>{
    if(challengeClaimed[ch.id])return;
    setChallengeClaimed(p=>({...p,[ch.id]:true}));
    setCash(c=>+(c+ch.reward.cash).toFixed(2));
    addTx("revenu",`Défi quotidien : ${ch.title}`,ch.reward.cash);
    addRestoXp(ch.reward.xp);
    addToast({icon:ch.icon,title:`Défi complété — +${ch.reward.cash}€`,
      msg:`${ch.title} · +${ch.reward.xp} XP`,color:C.purple,tab:"objectives"});
  };

  const getChallengeValue=(ch)=>{
    if(ch.key==="noLoss")return !challengeLostToday&&(challengeProgress.served||0)>=1?1:0;
    return challengeProgress[ch.key]||0;
  };

  return(
    <div style={{maxWidth:800,margin:"0 auto",padding:"10px 0"}}>

      {/* ── Daily challenges ── */}
      <div style={{background:C.purpleP,border:`1.5px solid ${C.purple}33`,
        borderRadius:16,padding:"18px 20px",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <span style={{fontSize:20}}>🎯</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.purple,fontFamily:F.title}}>Défis du jour</div>
            <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>Renouvelés chaque jour · récompenses immédiates</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(todayChallenges||[]).map(ch=>{
            const val=getChallengeValue(ch);
            const done=val>=ch.target;
            const claimed=!!(challengeClaimed||{})[ch.id];
            const pct=Math.min(100,Math.round((val/ch.target)*100));
            return(
              <div key={ch.id} style={{
                background:claimed?C.greenP:done?C.purple+"18":C.surface,
                border:`1.5px solid ${claimed?C.green+"55":done?C.purple:C.border}`,
                borderRadius:12,padding:"12px 16px",
                display:"flex",alignItems:"center",gap:12,
                transition:"all 0.2s"}}>
                <span style={{fontSize:24,flexShrink:0,filter:claimed?"grayscale(1)":"none"}}>{ch.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,
                      color:claimed?C.muted:done?C.purple:C.ink,
                      fontFamily:F.title}}>
                      {ch.title}
                    </span>
                    {claimed&&<span style={{fontSize:10,background:C.green,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>✓ Réclamé</span>}
                    {done&&!claimed&&<span style={{fontSize:10,background:C.purple,color:"#fff",
                      borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                      animation:"pulse 1s infinite"}}>🎉 Complété !</span>}
                  </div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:6}}>{ch.desc}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,
                        background:claimed?C.green:done?C.purple:C.amber,
                        width:`${pct}%`,transition:"width 0.4s"}}/>
                    </div>
                    <span style={{fontSize:10,color:done?C.purple:C.muted,
                      fontWeight:done?700:400,fontFamily:F.body,flexShrink:0}}>
                      {ch.key==="noLoss"?(challengeLostToday?"✗":"✓"):
                       ch.key==="fullHouse"?(val>=1?"✓":"En attente"):
                       ch.key==="vip"?(val>=1?"✓":"En attente"):
                       `${typeof val==="number"&&ch.key==="revenue"?val.toFixed(0):val}/${ch.target}`}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end",flexShrink:0}}>
                  <span style={{fontSize:11,color:C.amber,fontWeight:700,fontFamily:F.body}}>💶 +{ch.reward.cash}€</span>
                  <span style={{fontSize:11,color:C.green,fontWeight:700,fontFamily:F.body}}>⭐ +{ch.reward.xp} XP</span>
                  {done&&!claimed&&(
                    <button onClick={()=>claimChallenge(ch)} style={{
                      background:C.purple,color:"#fff",border:"none",
                      borderRadius:8,padding:"6px 14px",cursor:"pointer",
                      fontFamily:F.body,fontWeight:700,fontSize:12,marginTop:4,
                      boxShadow:`0 3px 10px ${C.purple}55`}}>
                      Réclamer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Jalons de progression ── */}
      {(()=>{
        const milestones=[
          {label:"10 clients",key:"totalServed",target:10,icon:"👥"},
          {label:"50 clients",key:"totalServed",target:50,icon:"🔥"},
          {label:"1k€ CA",key:"totalRevenue",target:1000,icon:"💶"},
          {label:"5k€ CA",key:"totalRevenue",target:5000,icon:"💰"},
          {label:"20k€ CA",key:"totalRevenue",target:20000,icon:"🏆"},
          {label:"Palace",key:"restoLevel",target:5,icon:"👑"},
        ];
        const vals={totalServed:objStats?.totalServed||0,totalRevenue:objStats?.totalRevenue||0,restoLevel:restoLvN||0};
        return(
          <div style={{background:C.card,border:`1.5px solid ${C.border}`,
            borderRadius:16,padding:"18px 20px",marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title,marginBottom:16,
              display:"flex",alignItems:"center",gap:8}}>
              <span>🗺</span> Jalons de progression
            </div>
            <div style={{display:"flex",alignItems:"center",gap:0,position:"relative"}}>
              {/* connecting line */}
              <div style={{position:"absolute",top:"50%",left:"5%",right:"5%",height:3,
                background:C.border,borderRadius:99,transform:"translateY(-50%)",zIndex:0}}/>
              {milestones.map((m,i)=>{
                const val=vals[m.key]||0;
                const done=val>=m.target;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                    position:"relative",zIndex:1}}>
                    <div style={{width:36,height:36,borderRadius:"50%",
                      background:done?C.amber:C.bg,
                      border:`3px solid ${done?C.amber:C.border}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:done?16:14,marginBottom:6,
                      boxShadow:done?`0 0 0 4px ${C.amber}33`:"none",
                      transition:"all 0.3s"}}>
                      {done?m.icon:"○"}
                    </div>
                    <div style={{fontSize:9,color:done?C.amber:C.muted,fontFamily:F.body,
                      fontWeight:done?700:400,textAlign:"center",lineHeight:1.3}}>
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Summary bar */}
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr 1fr":bp.isTablet?"repeat(2,1fr)":"repeat(4,1fr)",gap:bp.isMobile?8:12,marginBottom:28}}>
        {series.map(s=>{
          const all=OBJECTIVES_DEF.filter(o=>o.series===s);
          const done=all.filter(o=>completedIds.includes(o.id)).length;
          const pct=Math.round(done/all.length*100);
          const col=SERIES_COLORS[s];
          return(
            <div key={s} style={{background:col+"14",border:`1.5px solid ${col}22`,
              borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:800,color:col,fontFamily:F.title}}>{done}/{all.length}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginBottom:8}}>{SERIES_LABELS[s]}</div>
              <div style={{background:C.border,borderRadius:99,height:5}}>
                <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:99,transition:"width 0.4s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Objectives by series */}
      {series.map(s=>{
        const objs=OBJECTIVES_DEF.filter(o=>o.series===s);
        const col=SERIES_COLORS[s];
        return(
          <div key={s} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:3,height:20,background:col,borderRadius:99}}/>
              <div style={{fontSize:14,fontWeight:700,color:col,fontFamily:F.title}}>
                {SERIES_LABELS[s]}
              </div>
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
                    opacity:done&&!isPending?0.6:1,
                    transition:"all 0.2s"}}>
                    {/* Icon */}
                    <div style={{fontSize:28,flexShrink:0,
                      filter:done&&!isPending?"grayscale(1)":"none"}}>{obj.icon}</div>

                    {/* Text */}
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:isPending?col:done?C.muted:C.ink,
                          fontFamily:F.title}}>
                          {obj.title}
                        </span>
                        {done&&!isPending&&(
                          <span style={{fontSize:10,background:C.green,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700}}>
                            ✓ Complété
                          </span>
                        )}
                        {isPending&&(
                          <span style={{fontSize:10,background:col,color:"#fff",
                            borderRadius:99,padding:"1px 8px",fontFamily:F.body,fontWeight:700,
                            animation:"pulse 1s infinite"}}>
                            🎉 À récupérer !
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:6}}>
                        {obj.desc}
                      </div>
                      <div style={{display:"flex",gap:10}}>
                        <span style={{fontSize:11,color:C.amber,fontFamily:F.body,fontWeight:600}}>
                          💶 +{obj.reward.cash} €
                        </span>
                        <span style={{fontSize:11,color:C.green,fontFamily:F.body,fontWeight:600}}>
                          ⭐ +{obj.reward.xp} XP resto
                        </span>
                      </div>
                    </div>

                    {/* Claim button */}
                    {isPending&&(
                      <button onClick={()=>onClaim(obj.id)} style={{
                        background:col,color:"#fff",border:"none",
                        borderRadius:10,padding:"10px 18px",cursor:"pointer",
                        fontFamily:F.body,fontWeight:700,fontSize:13,flexShrink:0,
                        boxShadow:`0 4px 14px ${col}55`}}>
                        Récupérer
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
