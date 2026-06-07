import { memo } from "react";
import { C, F, CHEF_LVL } from "../../constants/gameData.js";
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

export const AdditionalChefCard = memo(function AdditionalChefCard({ idx, ac, setKitchen, setChefConfirmIdx }) {
  const acl = chefLv(ac.totalXp ?? 0);
  const aclD = CHEF_LVL[Math.min(acl.l, CHEF_LVL.length-1)];
  return (
    <Card accent={aclD.color+"44"}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
        <div style={{width:40,height:40,background:aclD.color+"1a",border:`2px solid ${aclD.color}33`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{aclD.icon}</div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:F.title}}>{ac.name}</div>
          <div style={{display:"flex",gap:5,marginTop:3}}>
            <Badge color={aclD.color} sm>{aclD.name}</Badge>
            <Badge color={C.amber} bg={C.amberP} sm>💶 {ac.salary}€/h</Badge>
          </div>
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4,fontFamily:F.body}}>
          <span>XP · Niv.{acl.l}</span><span style={{color:aclD.color,fontWeight:600}}>{acl.r}/{acl.n}</span>
        </div>
        <XpBar xp={acl.r} needed={acl.n} color={aclD.color}/>
      </div>
      <ShiftPicker shift={ac.shift??null} onChange={s=>setKitchen(k=>({...k,chefs:(k.chefs??[]).map((c,i)=>i===idx?{...c,shift:s}:c)}))}/>
      <div style={{display:"flex",gap:7}}>
        <Btn sm v="danger" onClick={()=>setChefConfirmIdx(idx)}>Licencier</Btn>
      </div>
    </Card>
  );
});
