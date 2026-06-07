import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { Btn } from "../../components/ui/index.js";
import { TRAINING_CATALOG } from "../../constants/serverConstants.js";
import { useLang } from "../../i18n/index.jsx";

export const ServerActions = memo(function ServerActions({
  sv, cash, setServers, setCash, addTx, addToast, onFire, onTrain,
}) {
  const { t: tr } = useLang();
  const isWorking = sv.status === "service";
  const moral = sv.moral ?? 100;
  const primeCost = 50;
  const canAffordPrime = cash >= primeCost;

  return (
    <>
      {Object.keys(sv.trainings||{}).length>0&&(
        <div style={{marginBottom:12,display:"flex",gap:4,flexWrap:"wrap"}}>
          {TRAINING_CATALOG.filter(d=>(sv.trainings||{})[d.id]>0).map(d=>(
            <span key={d.id} style={{fontSize:9,background:d.color+"14",color:d.color,border:`1px solid ${d.color}22`,borderRadius:5,padding:"1px 6px",fontFamily:F.body,fontWeight:600}}>
              {d.icon} N{(sv.trainings||{})[d.id]}
            </span>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        {sv.status==="actif"&&!isWorking&&(
          <Btn sm v="terra" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"pause"}:x))}>
            {tr("servers.pause")}
          </Btn>
        )}
        {sv.status==="pause"&&(
          <Btn sm v="primary" onClick={()=>setServers(p=>p.map(x=>x.id===sv.id?{...x,status:"actif"}:x))}>
            {tr("servers.activate")}
          </Btn>
        )}
        {isWorking&&(
          <span style={{fontSize:11,color:C.amber,fontFamily:F.body,alignSelf:"center"}}>
            {tr("servers.inService")}
          </span>
        )}
        {moral<60&&!isWorking&&(
          <Btn sm v={canAffordPrime?"navy":"disabled"} disabled={!canAffordPrime}
            onClick={()=>{
              if(!canAffordPrime)return;
              setCash&&setCash(c=>+(c-primeCost).toFixed(2));
              addTx&&addTx("achat",`Prime motivation — ${sv.name}`,primeCost);
              setServers(p=>p.map(x=>x.id!==sv.id?x:{...x,moral:Math.min(100,x.moral+50)}));
              addToast&&addToast({icon:"🎁",title:tr("servers.incentivePaid",{name:sv.name}),msg:tr("servers.incentiveMsg",{cost:primeCost}),color:C.navy,tab:"servers",silent:true});
            }}>
            {tr("servers.incentive",{cost:primeCost})}
          </Btn>
        )}
        {isWorking?(
          <div style={{fontSize:9,color:C.amber,fontFamily:F.body,fontWeight:600,background:C.amberP,borderRadius:6,padding:"3px 8px",border:`1px solid ${C.amber}33`}}>
            {tr("servers.inServiceShort")}
          </div>
        ):(
          <Btn sm v="danger" onClick={()=>onFire(sv)}>{tr("servers.fire")}</Btn>
        )}
        <Btn sm v="secondary" onClick={()=>onTrain(sv)} icon="🎓">{tr("servers.train")}</Btn>
      </div>
    </>
  );
});
