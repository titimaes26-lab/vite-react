import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { Btn, Modal, Lbl, Inp, Sel } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

export const EditDishModal = memo(function EditDishModal({ editId, form, setForm, ingLines, newIngS, setNewIngS, newIngQ, setNewIngQ, stock, save, del, addIngLine, removeIng, updateIngQty, onClose }) {
  const { t: tl } = useLang();
  return (
    <Modal title={editId?tl("menu.editDish"):tl("menu.newDish")} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,alignItems:"end"}}>
          <div><Lbl>{tl("menu.dishName")}</Lbl><Inp value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
          <div style={{minWidth:80}}><Lbl>{tl("menu.colPrice")} (€)</Lbl><Inp type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))}/></div>
          <div style={{minWidth:90}}><Lbl>{tl("menu.prepTime")}</Lbl><Inp type="number" value={form.prepTime} placeholder="60" onChange={e=>setForm(p=>({...p,prepTime:e.target.value}))}/></div>
        </div>
        <div><Lbl>{tl("menu.category")}</Lbl>
          <Sel value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
            {["Petit Déjeuner","Entrées","Plats","Desserts","Boissons"].map(c=><option key={c}>{c}</option>)}
          </Sel>
        </div>
        <div style={{background:C.terraP,border:`1.5px solid ${C.terra}22`,borderRadius:12,padding:14}}>
          <div style={{fontSize:12,fontWeight:600,color:C.terra,marginBottom:12,fontFamily:F.body}}>🧂 {tl("menu.recipe")}</div>
          {ingLines.length===0
            ?<div style={{fontSize:12,color:C.muted,fontStyle:"italic",fontFamily:F.body,marginBottom:12}}>{tl("menu.noIng")}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {ingLines.map(ing=>{
                const s = stock.find(x=>x.id===ing.stockId);
                const enough = s&&s.qty>=ing.qty;
                return (
                  <div key={ing.stockId} style={{display:"flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${enough?C.border:C.red+"44"}`,borderRadius:8,padding:"7px 10px"}}>
                    <span style={{flex:1,fontSize:12,fontWeight:600,color:C.ink,fontFamily:F.body}}>{s?.name||"?"} <span style={{color:C.muted,fontWeight:400}}>({s?.unit})</span></span>
                    <input type="number" value={ing.qty} step="0.01" min="0.01" onChange={e=>updateIngQty(ing.stockId,e.target.value)}
                      style={{width:70,background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 7px",fontSize:12,fontFamily:F.body,color:C.ink,textAlign:"right"}}/>
                    <span style={{fontSize:11,color:C.muted,fontFamily:F.body,minWidth:24}}>{s?.unit}</span>
                    {!enough&&<span style={{fontSize:10,color:C.red}}>⚠</span>}
                    <button onClick={()=>removeIng(ing.stockId)} style={{background:C.redP,border:`1px solid ${C.red}22`,borderRadius:6,color:C.red,cursor:"pointer",width:36,height:36,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
                  </div>
                );
              })}
            </div>
          }
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <div style={{flex:1}}><Lbl>{tl("menu.ingPrimary")}</Lbl>
              <Sel value={newIngS} onChange={e=>setNewIngS(e.target.value)}>
                <option value="">Choisir…</option>
                {stock.filter(s=>!ingLines.find(i=>i.stockId===s.id)).map(s=>(
                  <option key={s.id} value={s.id}>{s.name} ({s.unit}) — {s.qty} {tl("menu.inStock")}</option>
                ))}
              </Sel>
            </div>
            <div style={{width:80}}><Lbl>{tl("menu.qty")}</Lbl><Inp type="number" value={newIngQ} placeholder="0.0" onChange={e=>setNewIngQ(e.target.value)}/></div>
            <Btn v="terra" onClick={addIngLine} disabled={!newIngS||!newIngQ} icon="+">{tl("menu.add")}</Btn>
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
          <div>{editId&&<Btn v="danger" onClick={del}>{tl("menu.delete")}</Btn>}</div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={onClose} v="ghost">{tl("menu.cancel")}</Btn>
            <Btn onClick={save} disabled={!form.name||!form.price}>{tl("menu.saveDish")}</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
});
