import { memo } from "react";
import { useLang } from "../../i18n/index.jsx";
import { C, F, CHEF_LVL, COMMIS_LVL } from "../../constants/gameData.js";
import { Badge, Card, Btn, XpBar } from "../../components/ui/index.js";
import { commisLv } from "../../utils/levelUtils.js";

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

export const CommisSlotCard = memo(function CommisSlotCard({ idx, cm, locked, unlockedCommis, setKitchen, setCommisHireSlot, setCommisConfirmSlot }) {
  const { t: tr } = useLang();
  if (cm) {
    const cml=commisLv(cm.totalXp); const cmlD=COMMIS_LVL[Math.min(cml.l,COMMIS_LVL.length-1)];
    const specColor=cm.specialty?.cat==="Desserts"?C.purple:cm.specialty?.cat==="Plats"?C.terra:cm.specialty?.cat==="Entrées"?C.green:C.navy;
    const specBg=cm.specialty?.cat==="Desserts"?C.purpleP:cm.specialty?.cat==="Plats"?C.terraP:cm.specialty?.cat==="Entrées"?C.greenP:C.navyP;
    return(
      <Card key={cm.id} accent={cmlD.color+"44"}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:44,height:44,background:cmlD.color+"1a",border:`2px solid ${cmlD.color}33`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{cmlD.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:C.ink,fontFamily:F.title}}>{cm.name}</div>
              <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}><Badge color={cmlD.color} sm>{cmlD.name}</Badge></div>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>💶 {cm.salary}€/h</div></div>
        </div>
        {cm.specialty?(
          <div style={{background:specBg,border:`1px solid ${specColor}33`,borderRadius:8,padding:"6px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>{cm.specialty.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:specColor,fontFamily:F.body}}>{cm.specialty.name}</div>
              {cm.specialty.desc&&<div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{cm.specialty.desc}</div>}
            </div>
          </div>
        ):(
          <div style={{background:C.bg,border:`1px dashed ${C.border}`,borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:10,color:C.muted,fontFamily:F.body}}>Pas de spécialité</div>
        )}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}><span>XP · Niv.{cml.l}</span><span style={{color:cmlD.color,fontWeight:600}}>{cml.r}/{cml.n}</span></div>
          <XpBar xp={cml.r} needed={cml.n} color={cmlD.color}/>
        </div>
        <ShiftPicker shift={cm.shift??null} onChange={s=>setKitchen(k=>({...k,commis:k.commis.map((c,i)=>i===idx?{...c,shift:s}:c)}))}/>
        <div style={{display:"flex",gap:7}}>
          <Btn sm v="danger" onClick={()=>setCommisConfirmSlot(idx)}>{tr("servers.fire")}</Btn>
        </div>
      </Card>
    );
  }
  if (!locked) {
    return(
      <div onClick={()=>setCommisHireSlot(idx)} className="hovcard"
        style={{background:C.bg,border:`1.5px dashed ${C.green}55`,borderRadius:14,padding:"18px 16px",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:160,gap:10,cursor:"pointer",transition:"all 0.2s"}}>
        <div style={{width:44,height:44,background:C.greenP,border:`2px dashed ${C.green}66`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>➕</div>
        <div style={{fontSize:12,color:C.green,fontWeight:600,fontFamily:F.body}}>{tr("kitchen.addCommis")} {idx+1}</div>
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,textAlign:"center"}}>{tr("servers.clickHire")}</div>
      </div>
    );
  }
  const unlockLvlIdx=CHEF_LVL.findIndex(l=>l.commis>idx);
  const unlockName=unlockLvlIdx>=0?CHEF_LVL[unlockLvlIdx].name:"?";
  return(
    <div style={{background:C.bg,border:`1.5px dashed ${C.border}`,borderRadius:14,padding:"18px 16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:160,gap:8,opacity:0.6}}>
      <span style={{fontSize:32}}>🔒</span>
      <div style={{fontSize:11,color:C.muted,fontFamily:F.body,textAlign:"center"}}>{tr("kitchen.commis")} {idx+1}</div>
      <span style={{fontSize:11,background:C.bg,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",fontFamily:F.body,fontWeight:600}}>{unlockName}</span>
    </div>
  );
});
