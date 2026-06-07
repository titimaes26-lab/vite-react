import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F, CHEF_LVL, KITCHEN_UPGRADES } from "../../constants/gameData.js";
import { Badge, Card, Btn, XpBar } from "../../components/ui/index.js";
import { chefLv } from "../../utils/levelUtils.js";

const ShiftPicker = ({ shift, onChange }) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:10,color:"#8a7a65",fontFamily:F.body,marginBottom:5,fontWeight:600}}>🕐 Créneau</div>
    <div style={{display:"flex",gap:4}}>
      {[{id:null,label:"—",bg:"transparent",color:"#8a7a65",border:"#ddd0b8"},{id:"matin",label:"🌅 07h–15h",bg:"#fef3c7",color:"#92400e",border:"#f59e0b"},{id:"soir",label:"🌙 15h–23h",bg:"#ede9fe",color:"#5b21b6",border:"#8b5cf6"}].map(opt=>(
        <button key={String(opt.id)} onClick={()=>onChange(opt.id)} style={{flex:1,padding:"4px 0",borderRadius:7,fontSize:10,fontWeight:700,fontFamily:F.body,cursor:"pointer",background:shift===opt.id?opt.bg:"transparent",color:shift===opt.id?opt.color:"#8a7a65",border:`1.5px solid ${shift===opt.id?opt.border:"#ddd0b8"}`,transition:"all 0.12s"}}>{opt.label}</button>
      ))}
    </div>
  </div>
);

export const ChefCard = memo(function ChefCard({ chf, kitchen, cash, setCash, addTx, addToast, setKitchen, setChefModal, brigMorale, brigMoraleColor, brigMoraleIcon }) {
  const { t: tr } = useLang();
  const cl = chefLv(chf.totalXp??0);
  const clD = CHEF_LVL[Math.min(cl.l,CHEF_LVL.length-1)];
  const upg = {fourneau:0,four:0,stockage:0,plonge:0,salamandre:0,dressage:0,sousvide:0,brigade:0,...(kitchen?.upgrades||{})};
  const extraSlots = ["fourneau","dressage","brigade"].reduce((tot,id)=>{const item=KITCHEN_UPGRADES.find(u=>u.id===id);return tot+(item?item.levels.slice(0,upg[id]).reduce((s,l)=>s+(l.bonus.slots||0),0):0);},0);
  const brigadeSlot = (kitchen?.chefTrainings?.brigade&&kitchen?.chefTrainings?.brigadeUntil>Date.now())?1:0;
  const unlockedCommis = clD?.commis??0;
  const maxConcurrent = 4+unlockedCommis+extraSlots+brigadeSlot;
  const slotsLeft = maxConcurrent-(kitchen?.cooking?.length??0);

  return(
    <Card accent={clD.color+"44"}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:44,height:44,background:clD.color+"1a",border:`2px solid ${clD.color}33`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative"}}>
            {clD.icon}
            <div style={{position:"absolute",bottom:-5,right:-5,width:18,height:18,borderRadius:"50%",fontSize:10,background:C.surface,border:`1.5px solid ${brigMoraleColor}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{brigMoraleIcon}</div>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{chf.name}</div>
            <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}>
              <Badge color={clD.color} sm>{clD.name} N{cl.l}</Badge>
              <Badge color={C.amber} bg={C.amberP} sm>⚡×{clD.speed}</Badge>
            </div>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:F.title}}>{slotsLeft}/{maxConcurrent}<span style={{fontSize:10,color:C.muted}}> 🔥</span></div>
          <div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>🍽 {kitchen.totalDishes}</div>
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}><span>XP · Niv.{cl.l}</span><span style={{color:clD.color,fontWeight:600}}>{cl.r}/{cl.n}</span></div>
        <XpBar xp={cl.r} needed={cl.n} color={clD.color}/>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4,fontFamily:F.body}}>
          <span style={{color:C.muted}}>{tr("kitchen.moral")} {brigMoraleIcon}</span>
          <span style={{fontWeight:700,color:brigMoraleColor}}>{brigMorale}/100</span>
        </div>
        <div style={{height:6,background:C.border,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:"100%",background:brigMoraleColor,borderRadius:99,transformOrigin:"left center",transform:`scaleX(${brigMorale/100})`,transition:"transform 0.5s ease"}}/>
        </div>
        {brigMorale>=70&&<span style={{fontSize:9,color:C.green,fontFamily:F.body,fontWeight:600,marginTop:3,display:"block"}}>{tr("kitchen.speedBoost")}</span>}
        {brigMorale<30&&<span style={{fontSize:9,color:C.red,fontFamily:F.body,fontWeight:600,marginTop:3,display:"block"}}>{tr("kitchen.speedPenalty")}</span>}
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:12,fontFamily:F.body}}>💶 {chf.salary}€/h</div>
      <ShiftPicker shift={chf.shift??null} onChange={s=>setKitchen(k=>({...k,chef:{...k.chef,shift:s}}))}/>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
        <Btn sm v="navy" onClick={()=>setChefModal("train")} icon="📚">{tr("kitchen.trainChef")}</Btn>
        <Btn sm v="danger" onClick={()=>setChefModal("confirmReplace")}>{tr("servers.fire")}</Btn>
        {brigMorale<60&&(
          <Btn sm v={cash>=150?"amber":"disabled"} disabled={cash<150}
            onClick={()=>{if(cash<150)return;setCash(c=>+(c-150).toFixed(2));addTx("dépense","Prime brigade",150);setKitchen(k=>({...k,morale:Math.min(100,(k.morale??100)+30)}));addToast({icon:"🎉",title:tr("kitchen.incentive"),msg:tr("kitchen.incentiveDesc"),color:C.green,tab:"servers",silent:true});}}>
            💸 Prime 150€
          </Btn>
        )}
      </div>
    </Card>
  );
});
