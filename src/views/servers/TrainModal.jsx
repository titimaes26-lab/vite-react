import { C, F, SRV_LVL } from "../../constants/gameData.js";
import { TRAINING_CATALOG } from "../../constants/serverConstants.js";
import { Btn } from "../../components/ui/index.js";
import { srvLv } from "../../utils/levelUtils.js";

export function TrainModal({ sv, cash, tr, onClose, doTrain }) {
  const sl  = srvLv(sv.totalXp);
  const slD = SRV_LVL[Math.min(sl.l, SRV_LVL.length-1)];

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",
        zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:18,
          width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",
          boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center",
          position:"sticky",top:0,background:C.surface,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,background:slD.color+"1a",
              border:`2px solid ${slD.color}33`,borderRadius:10,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
              {slD.icon}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.ink,fontFamily:F.title}}>
                {tr("servers.trainTitle",{name:sv.name})}
              </div>
              <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:2}}>
                {tr("servers.trainSubtitle",{level:sl.l,xp:sv.totalXp,moral:sv.moral??100})}
                {sv.specialty?.name&&` · ${sv.specialty.icon||""} ${sv.specialty.name}`}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,
              width:44,height:44,cursor:"pointer",fontSize:18,color:C.muted,
              display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{padding:"10px 22px",background:C.bg,borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.muted,fontFamily:F.body}}>{tr("servers.balance")}</span>
          <span style={{fontSize:14,fontWeight:700,color:cash<100?C.red:C.green,fontFamily:F.title}}>
            {cash.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
          </span>
        </div>

        <div style={{padding:"16px 22px",display:"flex",flexDirection:"column",gap:20}}>
          {TRAINING_CATALOG.map(domain=>{
            const currentLevel = (sv.trainings||{})[domain.id]||0;
            const isMaxed      = currentLevel>=domain.levels.length;
            return(
              <div key={domain.id} style={{border:`1.5px solid ${domain.color}33`,borderRadius:14,overflow:"hidden"}}>
                <div style={{background:domain.color+"12",padding:"12px 16px",
                  display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${domain.color}22`}}>
                  <span style={{fontSize:22}}>{domain.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:domain.color,fontFamily:F.title}}>{domain.name}</div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>{domain.desc}</div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {domain.levels.map((_,i)=>(
                      <div key={i} style={{width:10,height:10,borderRadius:"50%",
                        background:i<currentLevel?domain.color:C.border,
                        border:`1.5px solid ${domain.color}`,transition:"background 0.3s"}}/>
                    ))}
                  </div>
                  {isMaxed&&(
                    <span style={{fontSize:11,background:domain.color,color:"#fff",
                      borderRadius:20,padding:"2px 8px",fontFamily:F.body,fontWeight:700}}>✓ Max</span>
                  )}
                </div>

                <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:8}}>
                  {domain.levels.map((level,i)=>{
                    const isDone        = i<currentLevel;
                    const isNext        = i===currentLevel;
                    const isLocked      = i>currentLevel;
                    const canAffordThis = cash>=level.cost;
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                        padding:"10px 12px",borderRadius:10,
                        background:isDone?C.greenP:isNext?domain.color+"0a":C.bg,
                        border:`1px solid ${isDone?C.green+"33":isNext?domain.color+"33":C.border}`,
                        opacity:isLocked?0.45:1}}>
                        <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                          background:isDone?C.green:isNext?domain.color:C.border,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:12,fontWeight:800,color:"#fff"}}>
                          {isDone?"✓":level.l}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                            <span style={{fontSize:12,fontWeight:700,fontFamily:F.body,
                              color:isDone?C.green:isNext?domain.color:C.muted}}>
                              {tr("servers.levelN",{n:level.l,name:level.name})}
                            </span>
                            {isDone&&<span style={{fontSize:9,background:C.green,color:"#fff",
                              borderRadius:99,padding:"1px 7px",fontFamily:F.body,fontWeight:700}}>
                              {tr("servers.acquired")}
                            </span>}
                          </div>
                          <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginBottom:4}}>{level.desc}</div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:10,background:domain.color+"14",color:domain.color,
                              border:`1px solid ${domain.color}22`,borderRadius:5,padding:"1px 7px",
                              fontFamily:F.body,fontWeight:600}}>✦ {level.effect}</span>
                            <span style={{fontSize:10,background:C.greenP,color:C.green,
                              border:`1px solid ${C.green}22`,borderRadius:5,padding:"1px 7px",
                              fontFamily:F.body,fontWeight:600}}>+{level.xp} XP</span>
                            {level.moralBonus>0&&(
                              <span style={{fontSize:10,background:C.amberP,color:C.amber,
                                border:`1px solid ${C.amber}22`,borderRadius:5,padding:"1px 7px",
                                fontFamily:F.body,fontWeight:600}}>+{level.moralBonus} moral</span>
                            )}
                          </div>
                        </div>
                        {isNext&&(
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            <div style={{fontSize:14,fontWeight:800,fontFamily:F.title,marginBottom:6,
                              color:canAffordThis?domain.color:C.red}}>{level.cost} €</div>
                            <Btn sm v={canAffordThis?"primary":"disabled"} disabled={!canAffordThis}
                              onClick={()=>doTrain(sv,domain,level)}>
                              {canAffordThis?tr("servers.fund"):tr("servers.noFunds")}
                            </Btn>
                          </div>
                        )}
                        {isDone&&<div style={{fontSize:11,color:C.green,fontFamily:F.body,flexShrink:0}}>✅</div>}
                        {isLocked&&<div style={{fontSize:11,color:C.muted,fontFamily:F.body,flexShrink:0}}>🔒</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
