import { memo } from "react";
import { C, F, RESTO_LVL, CHEF_LVL } from "../../constants/gameData.js";
import { useLang } from "../../i18n/index.jsx";

export const ReputationPanel = memo(function ReputationPanel({ reputation, repTier, nextRepTier, rl, rlD, nextRl, cl, clD, restoXp, loan }) {
  const { t: tl } = useLang();
  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {/* Reputation hero */}
        <div style={{background:`linear-gradient(135deg,${repTier.color}14,${C.surface})`,border:`2px solid ${repTier.color}33`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
              <svg width={64} height={64} style={{transform:"rotate(-90deg)"}}>
                <circle cx={32} cy={32} r={26} fill="none" stroke={C.border} strokeWidth={7}/>
                <circle cx={32} cy={32} r={26} fill="none" stroke={repTier.color} strokeWidth={7}
                  strokeDasharray={`${2*Math.PI*26}`}
                  strokeDashoffset={`${2*Math.PI*26*(1-reputation/100)}`}
                  strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:18}}>{repTier.icon}</span>
                <span style={{fontSize:9,fontWeight:800,color:repTier.color,fontFamily:F.title}}>{Math.round(reputation)}</span>
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:repTier.color,fontFamily:F.title}}>{repTier.label}</div>
              <div style={{display:"flex",gap:6,marginTop:5,flexWrap:"wrap"}}>
                <span style={{fontSize:10,background:repTier.tipMult>=1?C.greenP:C.redP,color:repTier.tipMult>=1?C.green:C.red,border:`1px solid ${repTier.tipMult>=1?C.green:C.red}22`,borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>💸 ×{repTier.tipMult}</span>
                <span style={{fontSize:10,background:repTier.spawnMult>=1?C.greenP:C.redP,color:repTier.spawnMult>=1?C.green:C.red,border:`1px solid ${repTier.spawnMult>=1?C.green:C.red}22`,borderRadius:5,padding:"1px 7px",fontFamily:F.body,fontWeight:600}}>🚶 ×{repTier.spawnMult}</span>
              </div>
            </div>
          </div>
          {nextRepTier && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted,fontFamily:F.body,marginBottom:4}}>
                <span>→ {nextRepTier.icon} {nextRepTier.label}</span>
                <span style={{color:repTier.color,fontWeight:700}}>{Math.round(nextRepTier.min-reputation)} pts</span>
              </div>
              <div style={{height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:99,background:repTier.color,width:"100%",transformOrigin:"left center",transform:`scaleX(${Math.max(0,(reputation-repTier.min)/(nextRepTier.min-repTier.min))})`,transition:"transform 0.8s"}}/>
              </div>
            </>
          )}
        </div>

        {/* Restaurant + Chef progression */}
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:36,height:36,background:rlD.color+"18",border:`2px solid ${rlD.color}33`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{rlD.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:700,color:rlD.color,fontFamily:F.title}}>{rlD.name}</span>
                <span style={{fontSize:11,fontWeight:700,color:rlD.color,fontFamily:F.body}}>N{rlD.l}</span>
              </div>
              <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden",marginTop:5}}>
                <div style={{height:"100%",width:"100%",background:rlD.color,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${(rl.pct||0)/100})`,transition:"transform 0.8s"}}/>
              </div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {rl.l<RESTO_LVL.length-1?`${restoXp||0} / ${nextRl.xpNeeded} XP`:tl("stats.maxLevel")}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <div style={{width:36,height:36,background:clD.color+"18",border:`2px solid ${clD.color}33`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{clD.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:700,color:clD.color,fontFamily:F.title}}>{clD.name}</span>
                <span style={{fontSize:11,fontWeight:700,color:clD.color,fontFamily:F.body}}>N{cl.l}</span>
              </div>
              <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden",marginTop:5}}>
                <div style={{height:"100%",width:"100%",background:clD.color,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${(cl.l<CHEF_LVL.length-1?Math.min(100,Math.round(cl.r/cl.n*100)):100)/100})`,transition:"transform 0.8s"}}/>
              </div>
              <div style={{fontSize:9,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {cl.l<CHEF_LVL.length-1?`${cl.r} / ${cl.n} XP`:tl("stats.maxLevel")} · ⚡×{clD.speed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loan && (
        <div style={{background:C.amberP,border:`1.5px solid ${C.amber}44`,borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <span style={{fontSize:18}}>🏦</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.amber,fontFamily:F.title}}>{tl("stats.loan")+" "+loan.label}</div>
            <div style={{fontSize:10,color:C.ink,fontFamily:F.body,marginTop:1}}>
              {tl("stats.remaining")} <strong>{loan.remaining.toFixed(2)} €</strong> · {loan.repayPerDay} {tl("stats.perDay")}
            </div>
          </div>
          <div style={{height:7,width:150,background:C.border,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,background:C.amber,width:"100%",transformOrigin:"left center",transform:`scaleX(${Math.max(0.02,1-loan.remaining/(loan.amount*(1+loan.rate)))})`}}/>
          </div>
        </div>
      )}
    </>
  );
});
