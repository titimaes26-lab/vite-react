import { memo } from "react";
import { C, F } from "../../constants/gameData.js";
import { FORMULA_PRESETS } from "../../constants/gameConstants.js";
import { Btn, Modal, Lbl, Sel } from "../../components/ui/index.js";
import { useLang } from "../../i18n/index.jsx";

const CAT_C = {"Petit Déjeuner":C.amber,Entrées:C.green,Plats:C.terra,Desserts:C.purple,Boissons:C.navy};

export const FormulasTab = memo(function FormulasTab({ formulas, setFormulas, menu, formulaModal, setFormulaModal, fSelections, setFSelections, unlocked, openFormula, saveFormula, bp }) {
  const { t: tl } = useLang();
  return (
    <div>
      <div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginBottom:16,lineHeight:1.6}}>
        {tl("menu.formulaDesc")}
      </div>
      <div style={{display:"grid",gridTemplateColumns:bp.isMobile?"1fr":bp.isTablet?"1fr 1fr":"repeat(auto-fill,minmax(270px,1fr))",gap:bp.isMobile?10:14}}>
        {FORMULA_PRESETS.map(preset => {
          const existing = (formulas||[]).find(f=>f.presetId===preset.id);
          return (
            <div key={preset.id} style={{background:C.card,border:`1.5px solid ${existing?.active?C.green+"55":C.border}`,borderRadius:14,padding:16,boxShadow:existing?.active?`0 2px 12px ${C.green}18`:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:26}}>{preset.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:F.title}}>{preset.name}</div>
                  <div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:1}}>{preset.desc}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(preset.discount*100)}%</div>
                  <div style={{fontSize:9,color:C.muted,fontFamily:F.body}}>{tl("menu.discount")}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                {preset.cats.map(cat=>(
                  <span key={cat} style={{fontSize:10,background:(CAT_C[cat]||C.navy)+"14",color:CAT_C[cat]||C.navy,border:`1px solid ${CAT_C[cat]||C.navy}22`,borderRadius:5,padding:"2px 7px",fontFamily:F.body,fontWeight:600}}>{cat}</span>
                ))}
              </div>
              {existing&&(
                <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 10px",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:F.body,marginBottom:3}}>✓ {existing.price.toFixed(2)}€</div>
                  {existing.items.map(item=>{
                    const d = menu.find(m=>m.id===item.menuId);
                    return d?<div key={item.menuId} style={{fontSize:10,color:C.muted,fontFamily:F.body}}>· {d.name} ({d.price}€)</div>:null;
                  })}
                </div>
              )}
              <div style={{display:"flex",gap:6}}>
                <Btn sm v="primary" onClick={()=>openFormula(preset)}>{existing?"✏️ "+tl("menu.modify"):"➕ "+tl("menu.create")}</Btn>
                {existing&&<Btn sm v={existing.active?"terra":"primary"} onClick={()=>setFormulas(p=>p.map(f=>f.id!==existing.id?f:{...f,active:!f.active}))}>{existing.active?"⏸ Pause":"▶ "+tl("menu.enable")}</Btn>}
                {existing&&<Btn sm v="ghost" onClick={()=>setFormulas(p=>p.filter(f=>f.id!==existing.id))}>🗑</Btn>}
              </div>
            </div>
          );
        })}
      </div>

      {formulaModal && (
        <Modal title={`Configurer — ${formulaModal.name}`} onClose={()=>setFormulaModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>
              {tl("menu.selectDish")} <strong style={{color:C.green}}>−{Math.round(formulaModal.discount*100)}%</strong>
            </div>
            {formulaModal.cats.map(cat=>(
              <div key={cat}>
                <Lbl>{cat}</Lbl>
                <Sel value={fSelections[cat]||""} onChange={e=>setFSelections(p=>({...p,[cat]:e.target.value}))}>
                  <option value="">{tl("menu.choose")}</option>
                  {menu.filter(m=>m.cat===cat&&m.enabled!==false&&unlocked(m)).map(m=>(
                    <option key={m.id} value={String(m.id)}>{m.name} — {m.price}€</option>
                  ))}
                </Sel>
              </div>
            ))}
            {formulaModal.cats.every(cat=>fSelections[cat]) && (() => {
              const total = formulaModal.cats.reduce((s,cat)=>{
                const d = menu.find(m=>m.id===parseInt(fSelections[cat]));
                return s+(d?.price||0);
              }, 0);
              const fp = +(total*(1-formulaModal.discount)).toFixed(2);
              return (
                <div style={{background:C.greenP,border:`1px solid ${C.green}33`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{tl("menu.alaCarte")} <s>{total.toFixed(2)}€</s></div>
                    <div style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:F.title}}>{tl("menu.formula")} {fp}€</div>
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:C.green,fontFamily:F.title}}>−{Math.round(formulaModal.discount*100)}%</div>
                </div>
              );
            })()}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn v="ghost" onClick={()=>setFormulaModal(null)}>{tl("menu.cancel")}</Btn>
              <Btn v="primary" disabled={!formulaModal.cats.every(cat=>fSelections[cat])} onClick={saveFormula}>{tl("menu.save")}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});
