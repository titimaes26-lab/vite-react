import { useState } from "react";
import { C, F } from "../constants/gameData.js";
import { Card, Badge, Modal, Lbl, Inp, Sel, Btn } from "../components/ui/index.js";
import { useLang } from "../i18n/index.jsx";

export function ComplaintsView({complaints,setComplaints,tables,servers,seenIds}){
  const { t: tl } = useLang();
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({date:"",table:"",server:"",type:"Qualité plat",desc:"",status:"nouveau",prio:"moyenne"});
  const [filter,setFilter]=useState("Tout");
  const types=["Qualité plat","Délai service","Attitude personnel","Facture incorrecte","Propreté","Autre"];
  const filtered=[...(filter==="Tout"?complaints:complaints.filter(c=>c.status===filter))].sort((a,b)=>b.date.localeCompare(a.date));
  const save=()=>{
    setComplaints(p=>[...p,{id:Date.now(),...form,table:+form.table}]);
    setModal(false);
  };
  const prioC={haute:C.red,moyenne:C.terra,basse:C.navy};
  const statC={résolu:C.green,"en cours":C.amber,nouveau:C.red};
  const statBg={résolu:C.greenP,"en cours":C.amberP,nouveau:C.redP};
  const prioLabel={haute:tl("complaints.high"),moyenne:tl("complaints.medium"),basse:tl("complaints.low")};
  const statLabel={résolu:tl("complaints.statusResolved"),"en cours":tl("complaints.statusInProgress"),nouveau:tl("complaints.statusNew")};
  return(
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{color:C.muted,fontSize:13,fontStyle:"italic",fontFamily:F.body,padding:"16px 0"}}>
            {tl("complaints.noneInCategory")}
          </div>
        )}
        {filtered.map(c=>(
          <Card key={c.id} accent={(statC[c.status]||C.muted)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <Badge color={prioC[c.prio]||C.muted} sm>{prioLabel[c.prio]||c.prio}</Badge>
                  <Badge color={statC[c.status]||C.muted} bg={statBg[c.status]||C.bg} sm>
                    {statLabel[c.status]||c.status}
                  </Badge>
                  {!seenIds?.has(c.id)&&c.status==="nouveau"&&(
                    <span style={{
                      background:C.red,color:"#fff",
                      fontSize:9,fontWeight:800,letterSpacing:"0.06em",
                      borderRadius:4,padding:"2px 7px",fontFamily:F.body,
                      textTransform:"uppercase",animation:"pulse 1.2s infinite"}}>
                      {"● "+tl("complaints.badgeNew")}
                    </span>
                  )}
                  <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>
                    Table {c.table} · {c.server} · {c.date}
                  </span>
                </div>
                <div style={{fontWeight:600,color:C.ink,fontSize:14,marginBottom:4,fontFamily:F.title}}>
                  {c.type}
                </div>
                <div style={{color:C.muted,fontSize:13,fontFamily:F.body}}>{c.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title={tl("complaints.report")} onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><Lbl>Date</Lbl><Inp type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
              <div>
                <Lbl>Table</Lbl>
                <Sel value={form.table} onChange={e=>setForm(p=>({...p,table:e.target.value}))}>
                  <option value="">{tl("complaints.select")}</option>
                  {tables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>{tl("complaints.colServer")}</Lbl>
              <Sel value={form.server} onChange={e=>setForm(p=>({...p,server:e.target.value}))}>
                <option value="">{tl("complaints.select")}</option>
                {servers.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              </Sel>
            </div>
            <div>
              <Lbl>Type</Lbl>
              <Sel value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                {types.map(t=><option key={t}>{t}</option>)}
              </Sel>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <Lbl>{tl("complaints.colPriority")}</Lbl>
                <Sel value={form.prio} onChange={e=>setForm(p=>({...p,prio:e.target.value}))}>
                  <option value="basse">{tl("complaints.low")}</option>
                  <option value="moyenne">{tl("complaints.medium")}</option>
                  <option value="haute">{tl("complaints.high")}</option>
                </Sel>
              </div>
              <div>
                <Lbl>{tl("complaints.colStatus")}</Lbl>
                <Sel value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="nouveau">{tl("complaints.statusNew")}</option>
                  <option value="en cours">{tl("complaints.statusInProgress")}</option>
                </Sel>
              </div>
            </div>
            <div>
              <Lbl>{tl("complaints.colDescription")}</Lbl>
              <textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} rows={3}
                style={{background:C.white,border:`1.5px solid ${C.border}`,borderRadius:9,
                  padding:"9px 13px",color:C.ink,fontSize:13,fontFamily:F.body,
                  outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
              <Btn onClick={()=>setModal(false)} v="ghost">{tl("menu.cancel")}</Btn>
              <Btn onClick={save} v="terra">{tl("complaints.save")}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
